// DatePicker.tsx
import React from 'react';
import { Steps, Input, Field } from '@chakra-ui/react';

interface DatePickerProps {
    date: string;
    setDate: (date: string) => void;
    defaultDate: string;
    label?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
    date,
    setDate,
    defaultDate,
    label,
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDate(e.target.value);
    };

    const handleBlur = () => {
        // If date is empty, set to default date
        if (!date) {
            setDate(defaultDate);
        }
    };

    return (
        <Field.Root>
            {label && <Field.Label>{label}</Field.Label>}
            <Input
                type="date"
                value={date}
                onValueChange={handleChange}
                onBlur={handleBlur}
            />
        </Field.Root>
    );
};

export default DatePicker;
