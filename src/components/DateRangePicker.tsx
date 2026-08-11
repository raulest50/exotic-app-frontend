
import { Flex, FlexProps } from "@chakra-ui/react";
import MyDatePicker from "./MyDatePicker.tsx";
import {format} from "date-fns";

interface DateRangePickerProps {
    date1:string;
    setDate1: (date1:string) => void;
    date2:string;
    setDate2: (date2:string) => void;
    flex_direction:FlexProps['direction'];
}

function DateRangePicker({date1, setDate1, date2, setDate2, flex_direction}:DateRangePickerProps){
    const today = format(new Date(), 'yyyy-MM-dd');

    return(
        <Flex direction={flex_direction} gap={4}>
            <MyDatePicker
                date={date1}
                setDate={setDate1}
                defaultDate={today}
                label="Fecha inicial"
            />
            <MyDatePicker
                date={date2}
                setDate={setDate2}
                defaultDate={today}
                label="Fecha final"
            />
        </Flex>
    );
}

export default DateRangePicker;
