import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: FilterOption[];
  value: string[];
  onChange: (selected: string[]) => void;
  label?: string;
}

export function MultiSelectFilter({ options, value, onChange, label = "Filter" }: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleSelectAll = () => {
    if (value.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(opt => opt.value));
    }
  };

  const handleClear = () => {
    onChange([]);
    setIsOpen(false);
  };

  const hasValue = value.length > 0;
  const allSelected = value.length === options.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={hasValue ? "border-primary" : ""}>
          <Filter className="h-4 w-4 mr-2" />
          {label}
          {hasValue && <span className="ml-2 text-xs">({value.length})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">{label}</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-auto p-1 text-xs"
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`filter-${option.value}`}
                  checked={value.includes(option.value)}
                  onCheckedChange={() => handleToggle(option.value)}
                />
                <Label
                  htmlFor={`filter-${option.value}`}
                  className="text-sm font-normal cursor-pointer flex-1"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleClear} className="flex-1">
              Clear
            </Button>
            <Button size="sm" onClick={() => setIsOpen(false)} className="flex-1">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
