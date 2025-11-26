import mongoose, { Document, Schema } from 'mongoose';

export interface IHistory extends Document {
  userId: mongoose.Types.ObjectId;
  actionType: 'TRANSLATE' | 'SUMMARIZE';
  inputContent: string;
  outputResult: string;
  metaData?: {
    targetLang?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

const HistorySchema = new Schema<IHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'UserId is required'],
    },
    actionType: {
      type: String,
      required: [true, 'ActionType is required'],
      enum: ['TRANSLATE', 'SUMMARIZE'],
    },
    inputContent: {
      type: String,
      required: [true, 'InputContent is required'],
    },
    outputResult: {
      type: String,
      required: [true, 'OutputResult is required'],
    },
    metaData: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const History = mongoose.model<IHistory>('History', HistorySchema);

