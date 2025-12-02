import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "lucide-react";

export interface DateRange {
  from: string | null;
  to: string | null;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  label?: string;
}

export function DateRangeFilter({ value, onChange, label = "Date Range" }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, from: e.target.value || null });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, to: e.target.value || null });
  };

  const handleClear = () => {
    onChange({ from: null, to: null });
    setIsOpen(false);
  };

  const hasValue = value.from || value.to;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={hasValue ? "border-primary" : ""}>
          <Calendar className="h-4 w-4 mr-2" />
          {label}
          {hasValue && <span className="ml-2 text-xs">({value.from || "..."} - {value.to || "..."})</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="from-date">From</Label>
            <Input
              id="from-date"
              type="date"
              value={value.from || ""}
              onChange={handleFromChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to-date">To</Label>
            <Input
              id="to-date"
              type="date"
              value={value.to || ""}
              onChange={handleToChange}
            />
          </div>
          <div className="flex gap-2">
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
