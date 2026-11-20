import { useId, useMemo, useState } from "react";
import { Box, Button, Checkbox, HStack, Input, Popover, Portal, Text, VStack } from "@chakra-ui/react";
import { LuListFilter } from "react-icons/lu";

interface Props {
    label: string;
    opciones: string[];
    seleccion: string[] | undefined;
    onChange: (seleccion: string[] | undefined) => void;
    disabled?: boolean;
}

export default function FiltroColumna({ label, opciones, seleccion, onChange, disabled }: Props) {
    const id = useId();
    const [busqueda, setBusqueda] = useState("");
    const visibles = useMemo(() => opciones.filter((opcion) =>
        opcion.toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es"))), [opciones, busqueda]);
    const elegidas = new Set(seleccion ?? opciones);

    const cambiar = (opcion: string, checked: boolean) => {
        const siguientes = new Set(elegidas);
        if (checked) siguientes.add(opcion);
        else siguientes.delete(opcion);
        onChange(siguientes.size === opciones.length ? undefined : [...siguientes]);
    };

    return (
        <Popover.Root positioning={{ placement: "bottom-start" }}>
            <Popover.Trigger asChild>
                <Button
                    size="xs" variant={seleccion ? "solid" : "ghost"} colorPalette={seleccion ? "teal" : "gray"}
                    aria-label={`Filtrar columna ${label}${seleccion ? ", filtro activo" : ""}`} disabled={disabled}
                >
                    <LuListFilter aria-hidden="true" />{label}
                </Button>
            </Popover.Trigger>
            <Portal>
                <Popover.Positioner>
                    <Popover.Content w="280px" maxW="calc(100vw - 2rem)">
                        <Popover.Body>
                            <VStack align="stretch" gap={3}>
                                <Text fontWeight="semibold" id={`${id}-titulo`}>Filtro: {label}</Text>
                                <Input size="sm" aria-label={`Buscar valores de ${label}`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                                <HStack>
                                    <Button size="xs" variant="outline" onClick={() => onChange(undefined)}>Todos</Button>
                                    <Button size="xs" variant="outline" onClick={() => onChange([])}>Ninguno</Button>
                                </HStack>
                                <Box maxH="15rem" overflowY="auto" role="group" aria-labelledby={`${id}-titulo`}>
                                    <VStack align="stretch" gap={2}>
                                        {visibles.map((opcion) => (
                                            <Checkbox.Root key={opcion} checked={elegidas.has(opcion)} onCheckedChange={({ checked }) => cambiar(opcion, checked === true)}>
                                                <Checkbox.HiddenInput />
                                                <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
                                                <Checkbox.Label overflowWrap="anywhere">{opcion}</Checkbox.Label>
                                            </Checkbox.Root>
                                        ))}
                                        {visibles.length === 0 && <Text fontSize="sm">Sin coincidencias.</Text>}
                                    </VStack>
                                </Box>
                                <Text fontSize="xs" color="app.textSubtle">Valores del cálculo completo, antes de paginar.</Text>
                            </VStack>
                        </Popover.Body>
                    </Popover.Content>
                </Popover.Positioner>
            </Portal>
        </Popover.Root>
    );
}
