import { ChevronDownIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DatePickerFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
}

export function DatePickerField({ id, label, value, onChange }: DatePickerFieldProps) {
    const [open, setOpen] = React.useState(false);
    const date = React.useMemo(() => {
        return value ? new Date(value) : undefined;
    }, [value]);

    return (
        <div className="space-y-2">
            <Label htmlFor={id} className="text-sm font-medium">
                {label}
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        id={id}
                        className="h-10 w-full justify-between font-normal"
                    >
                        {date ? date.toLocaleDateString() : 'Select date'}
                        <ChevronDownIcon className="h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        captionLayout="dropdown"
                        onSelect={(selectedDate) => {
                            if (selectedDate) {
                                const formattedDate = selectedDate.toISOString().split('T')[0];
                                onChange(formattedDate);
                                setOpen(false);
                            }
                        }}
                        disabled={(date) => date > new Date()}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
