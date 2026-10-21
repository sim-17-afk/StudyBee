const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 },
    activityType: {
      type: String,
      enum: ['quiz', 'revision', 'ai-chat', 'summarize', 'find-answers', 'general'],
      default: 'general',
    },
    topic: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudySession', studySessionSchema);
