import { Loader2, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

const SpeechButton = ({ text, language, className, ariaLabel = 'Text to speech' }) => {
  const { speak, stop, isPlaying, isLoading } = useTextToSpeech();
  const trimmedText = text?.trim();

  const handleClick = () => {
    if (!trimmedText) return;
    if (isPlaying) {
      stop();
    } else {
      speak(trimmedText, language);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={!trimmedText || isLoading}
      aria-label={ariaLabel}
      className={cn(
        'h-8 w-8 rounded-full text-slate-200 hover:text-white hover:bg-slate-800/70',
        isPlaying && 'animate-pulse text-green-400 hover:text-green-300',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <Square className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
};

export default SpeechButton;
