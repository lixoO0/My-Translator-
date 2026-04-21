import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
  user: mongoose.Types.ObjectId;
  text: string;
  sourceUrl?: string;
  createdAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    text: {
      type: String,
      required: [true, 'Text is required'],
    },
    sourceUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Note = mongoose.model<INote>('Note', NoteSchema);

