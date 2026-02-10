
export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface StoryState {
  image: string | null;
  paragraph: string;
  isGenerating: boolean;
  isNarrating: boolean;
  messages: Message[];
}

export interface AudioState {
  isPlaying: boolean;
  progress: number;
}
