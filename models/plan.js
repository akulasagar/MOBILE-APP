const mongoose = require('mongoose');

// --- Task Sub-Schema ---
// This is the blueprint for a SINGLE task within our plan.
const taskSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, "A task description is required."],
        trim: true
    },
    time: {
        type: String,
        required: [true, "A time for the task is required."]
    },
    isCompleted: {
        type: Boolean,
        default: false
    }
});


// --- Main Plan Schema ---
// This is the blueprint for the ENTIRE daily plan.
const planSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    },
    title: {
        type: String,
        required: [true, "A plan title is required."],
        trim: true
    },

    aiGeneratedSummary: {
        type: String,
        trim: true
    },

    date: {
        type: Date,
        default: Date.now
    },
    tasks: [taskSchema]
});

// --- Create and Export the Model ---
const Plan = mongoose.model('Plan', planSchema);

module.exports = Plan;