const express = require('express');
const router = express.Router();
const Plan = require('../models/Plan');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const auth = require('../middleware/auth');
const { normalizeTime, parseTime } = require('../utils/timeUtils');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

router.get('/by-date/:date', auth, async (req, res) => {
    try {
        const dateString = req.params.date;
        const startDate = new Date(`${dateString}T00:00:00.000Z`);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);

        const plansForDate = await Plan.find({
            user: req.user.id,
            date: { $gte: startDate, $lt: endDate }
        }).sort({ "tasks.time": 1 });

        res.status(200).json(plansForDate);
    } catch (error) {
        console.error("Error fetching plans for date:", error.message);
        res.status(500).json({ message: "Error fetching plans for date", error: error.message });
    }
});


router.post('/', auth, async (req, res) => {
    try {
        const { title, tasks, date } = req.body;
        let aiSummary = '';

        const normalizedTasks = tasks.map(task => ({
            ...task,
            time: normalizeTime(task.time)
        }));

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const prompt = `The title of my daily plan is "${title}". Based on this, generate a very short, positive, and encouraging one-sentence summary to motivate me for the day.`;
            const result = await model.generateContent(prompt);
            aiSummary = result.response.text();
        } catch (aiError) {
            console.error("AI Generation Error:", aiError);
            aiSummary = "Let's make today a great one!";
        }

        const planData = {
            title,
            tasks: normalizedTasks,
            aiGeneratedSummary: aiSummary,
            date,
            user: req.user.id
        };
        const newPlan = new Plan(planData);
        const savedPlan = await newPlan.save();
        res.status(201).json(savedPlan);
    } catch (dbError) {
        res.status(400).json({ message: "Error creating plan", error: dbError.message });
    }
});


router.put('/:id', auth, async (req, res) => {
    try {
        const planIdToUpdate = req.params.id;
        const { title, tasks, date } = req.body;

        const normalizedTasks = tasks.map(task => ({
            ...task,
            time: normalizeTime(task.time)
        }));

        let originalPlan = await Plan.findById(planIdToUpdate);
        if (!originalPlan) {
            return res.status(404).json({ message: 'Plan not found.' });
        }

        if (originalPlan.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const now = new Date();
        if (originalPlan.tasks && originalPlan.tasks.length > 0) {
            const { hours, minutes } = parseTime(originalPlan.tasks[0].time);
            if (!isNaN(hours)) {
                const planDateTime = new Date(originalPlan.date);
                planDateTime.setHours(hours, minutes, 0, 0);
                const fifteenMinutesInMillis = 15 * 60 * 1000;
                if (planDateTime.getTime() - now.getTime() < fifteenMinutesInMillis) {
                    return res.status(403).json({ message: "Time limit reached. Plans cannot be modified within 15 minutes of their start time." });
                }
            }
        }

        const startDate = new Date(`${date}T00:00:00.000Z`);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1);

        const otherPlansOnDay = await Plan.find({
            user: req.user.id,
            date: { $gte: startDate, $lt: endDate },
            _id: { $ne: planIdToUpdate }
        });

        const existingTimes = new Set();
        otherPlansOnDay.forEach(p => {
            p.tasks.forEach(t => existingTimes.add(t.time));
        });

        for (const task of normalizedTasks) {
            if (existingTimes.has(task.time)) {
                return res.status(409).json({ message: `You already have another task scheduled for ${task.time} on this day.` });
            }
        }

        const updatedPlanData = { title, tasks: normalizedTasks, date, aiGeneratedSummary: originalPlan.aiGeneratedSummary, user: req.user.id };
        const updatedPlan = await Plan.findByIdAndUpdate(planIdToUpdate, updatedPlanData, { new: true });

        res.json(updatedPlan);

    } catch (error) {
        console.error("Error updating plan:", error);
        res.status(500).json({ message: "Error updating plan", error: error.message });
    }
});


router.delete('/:id', auth, async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);
        if (!plan) return res.status(404).json({ message: 'Plan not found.' });

        if (plan.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        
        const now = new Date();
        if (plan.tasks && plan.tasks.length > 0) {
            const { hours, minutes } = parseTime(plan.tasks[0].time);
            if (!isNaN(hours)) {
                const planDateTime = new Date(plan.date);
                planDateTime.setHours(hours, minutes, 0, 0);
                const fifteenMinutesInMillis = 15 * 60 * 1000;
                if (planDateTime.getTime() - now.getTime() < fifteenMinutesInMillis) {
                    return res.status(403).json({ message: "Time limit reached. Plans starting within 15 minutes cannot be deleted." });
                }
            }
        }
        await Plan.findByIdAndDelete(req.params.id);
        res.json({ message: 'Plan deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting plan', error: error.message });
    }
});


router.patch('/:planId/tasks/:taskId', auth, async (req, res) => {
    try {
        const { planId, taskId } = req.params;
        const plan = await Plan.findById(planId);
        if (!plan) return res.status(404).json({ message: 'Plan not found.' });

        if (plan.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const task = plan.tasks.id(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found.' });
        task.isCompleted = !task.isCompleted;
        await plan.save();
        res.status(200).json(plan);
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: 'Error updating task', error: anerror.message });
    }
});

module.exports = router;