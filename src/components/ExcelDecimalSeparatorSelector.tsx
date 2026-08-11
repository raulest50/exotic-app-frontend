import { Box, HStack, Icon, Radio, RadioGroup, Text, Field } from "@chakra-ui/react";
import type { FormControlProps, Field } from "@chakra-ui/react";
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
        <Field.Root maxW={maxW}>
            <Field.Label mb={2}>
                <HStack gap={2}>
                    <Icon color="green.500" boxSize={4} asChild><FaFileExcel /></Icon>
                    <Text as="span">Separador decimal para copiar</Text>
                </HStack>
            </Field.Label>
            <Box borderWidth="1px" borderRadius="md" borderColor="app.border" px={3} py={2}>
                <RadioGroup
                    value={value}
                    onChange={(nextValue) => onChange(nextValue as ExcelDecimalSeparator)}
                >
                    <HStack gap={4} flexWrap="wrap">
                        <Radio value="COMMA" colorPalette="green">
                            Coma (,)
                        </Radio>
                        <Radio value="DOT" colorPalette="green">
                            Punto (.)
                        </Radio>
                    </HStack>
                </RadioGroup>
            </Box>
        </Field.Root>
    );
}
