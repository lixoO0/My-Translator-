import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useAccessibility } from '@/context/AccessibilityContext';

const AccessibilityMenu = () => {
  const { fontSize, isDyslexicFont, isHighContrast, updateSettings } =
    useAccessibility();

  const handleFontSizeChange = (value) => {
    updateSettings({ fontSize: value[0] });
  };

  const handleDyslexicFontToggle = (checked) => {
    updateSettings({ isDyslexicFont: checked });
  };

  const handleHighContrastToggle = (checked) => {
    updateSettings({ isHighContrast: checked });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Accessibility settings"
        >
          <Eye className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[300px] p-4 space-y-4"
      >
        {/* Text Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="font-size" className="text-sm font-medium">
              Text Size: {fontSize}%
            </Label>
          </div>
          <Slider
            id="font-size"
            value={[fontSize]}
            onValueChange={handleFontSizeChange}
            min={100}
            max={150}
            step={5}
            className="w-full"
          />
        </div>

        {/* Dyslexic Font */}
        <div className="flex items-center justify-between space-x-2">
          <Label
            htmlFor="dyslexic-font"
            className="text-sm font-medium flex-1 cursor-pointer"
          >
            Dyslexic Font
          </Label>
          <Switch
            id="dyslexic-font"
            checked={isDyslexicFont}
            onCheckedChange={handleDyslexicFontToggle}
          />
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between space-x-2">
          <Label
            htmlFor="high-contrast"
            className="text-sm font-medium flex-1 cursor-pointer"
          >
            High Contrast
          </Label>
          <Switch
            id="high-contrast"
            checked={isHighContrast}
            onCheckedChange={handleHighContrastToggle}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccessibilityMenu;

