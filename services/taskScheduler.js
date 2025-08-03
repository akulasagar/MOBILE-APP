const cron = require('node-cron');
const Plan = require('../models/Plan');
const User = require('../models/User'); // Import the User model
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

const startScheduler = () => {
    console.log('🕒 Task Scheduler has been initialized.');

    cron.schedule('* * * * *', async () => {
        const now = new Date();
        console.log(`\n⏰ Cron job running at: ${now.toLocaleTimeString()}`);

        try {
            const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Corrected to be exclusive of the next day start
            
            // Find today's plans and populate the 'user' field to get user details
            const todaysPlans = await Plan.find({ date: { $gte: startDate, $lt: endDate } }).populate('user', 'pushToken');

            if (todaysPlans.length === 0) return;

            for (const plan of todaysPlans) {
                // Check if the plan has a valid user with a push token
                if (!plan.user || !plan.user.pushToken) {
                    console.log(`   ⚠️ Skipping plan ID ${plan._id}: No associated user or push token.`);
                    continue;
                }

                for (const task of plan.tasks) {
                    if (task.isCompleted) continue;

                    const taskTime = parseTime(task.time);
                    if (!taskTime) continue;

                    // Set the date part of taskTime to today for accurate comparison
                    taskTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
                    const diffInMinutes = (taskTime.getTime() - now.getTime()) / 1000 / 60;

                    if (diffInMinutes > 4.5 && diffInMinutes < 5.5) {
                        console.log(`   ✅ UPCOMING TASK FOUND: "${task.description}" at ${task.time}`);
                        try {
                            console.log("      -> Asking AI for a creative reminder...");
                            const prompt = `Generate a short, creative, and encouraging push notification message to remind me to do the following task: "${task.description}". The task is scheduled for ${task.time}. Be friendly and motivational.`;
                            const result = await model.generateContent(prompt);
                            const aiReminder = result.response.text().trim();
                            console.log(`      🤖 AI Reminder: "${aiReminder}"`);
                            
                            // --- [NEW] Get the push token from the populated user object ---
                            const pushToken = plan.user.pushToken;
                            
                            const message = {
                                to: pushToken,
                                sound: 'default',
                                title: `🔔 Reminder: ${task.description}`,
                                body: aiReminder,
                                data: { planId: plan._id.toString() },
                            };

                            console.log(`   -> Sending notification to token: ...${pushToken.slice(-6)}`);
                            await axios.post('https://exp.host/--/api/v2/push/send', message, {
                                headers: {
                                    'Accept': 'application/json',
                                    'Accept-encoding': 'gzip, deflate',
                                    'Content-Type': 'application/json',
                                },
                            });
                            console.log('   🚀 Notification sent successfully!');

                        } catch (e) {
                            console.error("   ❌ Error during notification process:", e.response ? e.response.data : e.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("   ❌ Error during cron job execution:", error);
        }
    });
};

function parseTime(timeStr) {
    if (!timeStr) return null;
    // Handles HH:mm format
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    if (isNaN(hours) || isNaN(minutes)) return null;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
}

module.exports = { startScheduler };