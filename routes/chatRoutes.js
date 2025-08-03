const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Plan = require('../models/plan');
const auth = require('../middleware/auth');
const { normalizeTime, parseTime } = require('../utils/timeUtils');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

router.post('/', auth, async (req, res) => {
    try {
        const { message: userMessage, history, pushToken } = req.body;
        if (!userMessage) return res.status(400).json({ error: "Message is required." });

        const today = new Date();
        const year = today.getFullYear();
        const todayDateString = today.toISOString().split('T')[0];
        
        const recentHistory = history ? history.slice(-6) : [];
        const formattedHistory = recentHistory.map(msg => 
            `${msg.sender === 'user' ? 'User' : 'Aura'}: ${msg.text}`
        ).join('\n');

        const prompt = `
            --- CONVERSATION HISTORY (FOR CONTEXT) ---
            ${formattedHistory}
            ------------------------------------------

            SYSTEM PROMPT:
            You are "Aura," an intelligent AI assistant. Analyze the "Current User Request" below. Your default behavior is to be a helpful conversationalist.

            Your capabilities:
            1.  **General Conversation (Default):** If the user's request is a greeting, a follow-up question, or a statement about a past event, you MUST respond with simple text. DO NOT use JSON.
            2.  **Structured Actions:** ONLY if the user's request is a clear command to schedule, delete, edit, or review tasks, you MUST respond with a JSON object. This JSON MUST contain a "response_type" key.
            
            CRITICAL INSTRUCTION: You are a DIRECT ACTION assistant. When a user asks you to perform an action, create the JSON for that action immediately. Your 'confirmation_message' MUST state the action is complete. DO NOT ask for confirmation.
            
            TIME FORMAT: In your JSON response, the "time" field for tasks MUST be in 24-hour HH:mm format (e.g., "19:30" for 7:30 PM).

            Action Formats (only use if it's a direct command):
            - SCHEDULING: { "response_type": "schedule", "data": { "title": "short plan title", "date": "YYYY-MM-DD", "tasks": [{"description": "task desc", "time": "HH:mm"}] }, "confirmation_message": "friendly message for the user" }
            - DELETING: { "response_type": "delete", "data": { "task_description": "description of task to delete", "date": "YYYY-MM-DD" }, "confirmation_message": "friendly confirmation message" }
            - EDITING: { "response_type": "edit", "data": { "original_task_description": "the task to find", "date": "YYYY-MM-DD", "new_description": "the new description (optional)", "new_time": "the new time (optional, HH:mm)" }, "confirmation_message": "friendly confirmation message" }
            - REVIEWING: { "response_type": "review", "data": { "duration": "upcoming" | "full_day" } }
            
            CRITICAL DATE INSTRUCTION: Today is ${todayDateString}. Unless a year is specified, always use the current year: ${year}.

            --- CURRENT USER REQUEST ---
            ${userMessage}
            ----------------------------
            Aura:
        `;

        const result = await model.generateContent(prompt);
        let aiResponseText = result.response.text();

        aiResponseText = aiResponseText.replace(/```json/g, "").replace(/```/g, "").trim();

        if (aiResponseText.startsWith('{') && aiResponseText.endsWith('}')) {
            try {
                const jsonResponse = JSON.parse(aiResponseText);
                const actionType = jsonResponse.response_type;
                const data = jsonResponse.data;
                
                if (actionType === 'schedule') {
                    console.log("-> AI identified a SCHEDULE request.");
                    let { title, date, tasks: newTasksFromAI } = data;
                    if (!title || !date || !newTasksFromAI) throw new Error("AI response missing schedule data.");
                    if (!date.startsWith(year.toString())) { const monthAndDay = date.substring(5); date = `${year}-${monthAndDay}`; }
                    
                    const normalizedNewTasks = newTasksFromAI.map(task => ({
                        ...task,
                        time: normalizeTime(task.time)
                    }));

                    const searchDate = new Date(`${date}T00:00:00.000Z`);
                    const endDate = new Date(searchDate); 
                    endDate.setDate(searchDate.getDate() + 1);

                    const existingPlans = await Plan.find({
                        user: req.user.id,
                        date: { $gte: searchDate, $lt: endDate }
                    });

                    const existingTimes = new Set();
                    existingPlans.forEach(plan => {
                        plan.tasks.forEach(task => existingTimes.add(task.time));
                    });

                    for (const task of normalizedNewTasks) {
                        if (existingTimes.has(task.time)) {
                            const conflictMessage = `Sorry, I can't schedule "${task.description}" because you already have another task scheduled for ${task.time} on that day.`;
                            console.log("-> Time conflict detected. Sending error reply.");
                            return res.status(200).json({ reply: conflictMessage });
                        }
                    }

                    const newPlan = new Plan({ 
                        user: req.user.id,
                        title, 
                        date, 
                        tasks: normalizedNewTasks, 
                        aiGeneratedSummary: "A new day...", 
                        pushToken 
                    });

                    const savedPlan = await newPlan.save();
                    return res.status(200).json({ reply: jsonResponse.confirmation_message, action: 'plan_created', plan: savedPlan });
                
                } else if (actionType === 'delete') {
                    // This logic is now simplified because we can assume normalized times
                    console.log("-> AI identified a DELETE request.");
                    let { task_description, date } = data;
                    if (!task_description || !date) throw new Error("Missing data for delete.");
                    if (!date.startsWith(year.toString())) date = `${year}-${date.substring(5)}`;
                    const searchDate = new Date(`${date}T00:00:00.000Z`);
                    const endDate = new Date(searchDate); endDate.setDate(searchDate.getDate() + 1);
                    const plansOnDate = await Plan.find({ user: req.user.id, date: { $gte: searchDate, $lt: endDate } });
                    
                    let planToDeleteFrom = null, taskToDelete = null;
                    for (const plan of plansOnDate) {
                        const foundTask = plan.tasks.find(t => t.description.toLowerCase().includes(task_description.toLowerCase()));
                        if (foundTask) {
                            planToDeleteFrom = plan;
                            taskToDelete = foundTask;
                            break;
                        }
                    }
                    if (!planToDeleteFrom || !taskToDelete) return res.status(200).json({ reply: `I couldn't find a task like "${task_description}".` });
                    
                    if (planToDeleteFrom.tasks.length === 1) {
                        await Plan.findByIdAndDelete(planToDeleteFrom._id);
                    } else {
                        planToDeleteFrom.tasks.pull({ _id: taskToDelete._id });
                        await planToDeleteFrom.save();
                    }
                    return res.status(200).json({ reply: jsonResponse.confirmation_message || `Okay, I've deleted "${taskToDelete.description}".`, action: 'plan_deleted' });
                
                } else if (actionType === 'edit') {
                    // This logic is also simplified
                    console.log("-> AI identified an EDIT request.");
                    const { original_task_description, date, new_description, new_time } = data;
                    if (!original_task_description || !date || (!new_description && !new_time)) throw new Error("Missing data for edit.");
                    
                    let correctedDate = date; 
                    if (!correctedDate.startsWith(year.toString())) correctedDate = `${year}-${correctedDate.substring(5)}`;
                    
                    const searchDate = new Date(`${correctedDate}T00:00:00.000Z`);
                    const endDate = new Date(searchDate); 
                    endDate.setDate(searchDate.getDate() + 1);
                    
                    const plansOnDate = await Plan.find({ user: req.user.id, date: { $gte: searchDate, $lt: endDate } });
                    
                    let planToEdit = null, taskToEdit = null;
                    for (const plan of plansOnDate) {
                        const foundTask = plan.tasks.find(t => t.description.toLowerCase().includes(original_task_description.toLowerCase()));
                        if (foundTask) { planToEdit = plan; taskToEdit = foundTask; break; }
                    }
                    
                    if (!planToEdit || !taskToEdit) return res.status(200).json({ reply: `I couldn't find a task like "${original_task_description}" to edit.` });

                    if (new_time) {
                        const normalizedNewTime = normalizeTime(new_time);
                        const allTasksOnDay = [];
                        plansOnDate.forEach(p => { p.tasks.forEach(t => { if (t._id.toString() !== taskToEdit._id.toString()) allTasksOnDay.push(t.time); }); });
                        if (allTasksOnDay.includes(normalizedNewTime)) return res.status(200).json({ reply: `Sorry, you already have another task scheduled for ${new_time}.` });
                        taskToEdit.time = normalizedNewTime;
                    }
                    if (new_description) taskToEdit.description = new_description;
                    
                    await planToEdit.save();
                    return res.status(200).json({ reply: jsonResponse.confirmation_message || "Done! I've updated your plan.", action: 'plan_edited' });

                } else if (actionType === 'review') {
                    // This logic can remain as is, it depends on parsing, not comparing
                    console.log("-> AI identified a REVIEW request.");
                    const duration = data.duration || 'upcoming';
                    const now = new Date();
                    const plansForToday = await Plan.find({ user: req.user.id, date: { $gte: new Date().setHours(0,0,0,0), $lte: new Date().setHours(23,59,59,999) } });
                    let upcomingTasks = [];
                    plansForToday.forEach(plan => { plan.tasks.forEach(task => { const { hours, minutes } = parseTime(task.time); if(isNaN(hours)) return; const taskDateTime = new Date(plan.date.getFullYear(), plan.date.getMonth(), plan.date.getDate(), hours, minutes); if (taskDateTime > now && !task.isCompleted) upcomingTasks.push({ description: task.description, time: task.time }); }); });
                    upcomingTasks.sort((a, b) => { const timeA = parseTime(a.time); const timeB = parseTime(b.time); if(timeA.hours !== timeB.hours) return timeA.hours - timeB.hours; return timeA.minutes - timeB.minutes; });
                    const taskStrings = upcomingTasks.map(t => `at ${t.time} you have "${t.description}"`);
                    let reviewReply = taskStrings.length > 0 ? `Okay, coming up: ${taskStrings.join(', and later ')}.` : "Your schedule is clear for now!";
                    return res.status(200).json({ reply: reviewReply });
                } else {
                    return res.status(200).json({ reply: "I'm not sure how to handle that request, but I'm learning!" });
                }
            } catch (e) {
                console.error("Error parsing AI JSON response:", e);
                return res.status(200).json({ reply: "I had a little trouble formatting my thoughts." });
            }
        } else {
            return res.status(200).json({ reply: aiResponseText });
        }
    } catch (error){
        console.error("Critical Error in chat endpoint:", error);
        res.status(500).json({ error: "Sorry, I'm having trouble thinking right now." });
    }
});

module.exports = router;