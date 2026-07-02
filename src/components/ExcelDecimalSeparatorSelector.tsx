import {
    Box,
    FormControl,
    FormLabel,
    HStack,
    Icon,
    Radio,
    RadioGroup,
    Text,
} from "@chakra-ui/react";
import type { FormControlProps } from "@chakra-ui/react";
import { FaFileExcel } from "react-icons/fa6";
import type { ExcelDecimalSeparator } from "../api/EndPointsURL";

export const DEFAULT_EXCEL_DECIMAL_SEPARATOR: ExcelDecimalSeparator = "COMMA";

type Props = {
    value: ExcelDecimalSeparator;
    onChange: (value: ExcelDecimalSeparator) => void;
    maxW?: FormControlProps["maxW"];
};

export default function ExcelDecimalSeparatorSelector({ value, onChange, maxW = "md" }: Props) {
    return (
        <FormControl maxW={maxW}>
            <FormLabel mb={2}>
                <HStack spacing={2}>
                    <Icon as={FaFileExcel} color="green.500" boxSize={4} />
                    <Text as="span">Separador decimal para copiar</Text>
                </HStack>
            </FormLabel>
            <Box borderWidth="1px" borderRadius="md" borderColor="app.border" px={3} py={2}>
                <RadioGroup
                    value={value}
                    onChange={(nextValue) => onChange(nextValue as ExcelDecimalSeparator)}
                >
                    <HStack spacing={4} flexWrap="wrap">
                        <Radio value="COMMA" colorScheme="green">
                            Coma (,)
                        </Radio>
                        <Radio value="DOT" colorScheme="green">
                            Punto (.)
                        </Radio>
                    </HStack>
                </RadioGroup>
            </Box>
        </FormControl>
    );
}
