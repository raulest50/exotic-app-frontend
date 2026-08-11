import { Box, Field, HStack, Icon, RadioGroup, Text } from "@chakra-ui/react";
import type { FieldRootProps } from "@chakra-ui/react";
import { FaFileExcel } from "react-icons/fa6";
import type { ExcelDecimalSeparator } from "../api/EndPointsURL";

export const DEFAULT_EXCEL_DECIMAL_SEPARATOR: ExcelDecimalSeparator = "COMMA";

type Props = {
    value: ExcelDecimalSeparator;
    onChange: (value: ExcelDecimalSeparator) => void;
    maxW?: FieldRootProps["maxW"];
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
                <RadioGroup.Root
                    value={value}
                    onValueChange={({ value: nextValue }) =>
                        onChange(nextValue as ExcelDecimalSeparator)
                    }
                    colorPalette="green"
                >
                    <HStack gap={4} flexWrap="wrap">
                        <RadioGroup.Item value="COMMA">
                            <RadioGroup.ItemHiddenInput />
                            <RadioGroup.ItemControl>
                                <RadioGroup.ItemIndicator />
                            </RadioGroup.ItemControl>
                            <RadioGroup.ItemText>Coma (,)</RadioGroup.ItemText>
                        </RadioGroup.Item>
                        <RadioGroup.Item value="DOT">
                            <RadioGroup.ItemHiddenInput />
                            <RadioGroup.ItemControl>
                                <RadioGroup.ItemIndicator />
                            </RadioGroup.ItemControl>
                            <RadioGroup.ItemText>Punto (.)</RadioGroup.ItemText>
                        </RadioGroup.Item>
                    </HStack>
                </RadioGroup.Root>
            </Box>
        </Field.Root>
    );
}
