import { Button, Field, Flex, Input, NativeSelect } from "@chakra-ui/react";
import type { FiltrosLecturaTerminados } from "./types";

interface Props {
    value: FiltrosLecturaTerminados;
    categorias: ReadonlyArray<{ categoriaId: number; categoriaNombre: string }>;
    onChange: (value: FiltrosLecturaTerminados) => void;
}

export default function FiltrosIngresoTerminados({ value, categorias, onChange }: Props) {
    return (
        <Flex gap={3} align="flex-start" flexDir={{ base: "column", md: "row" }}>
            <Field.Root flex={1} minW={0}>
                <Field.Label>Nombre del producto</Field.Label>
                <Input
                    type="search"
                    placeholder="Buscar por nombre"
                    autoComplete="off"
                    value={value.nombre}
                    onChange={(event) => onChange({ ...value, nombre: event.target.value })}
                />
            </Field.Root>
            <Field.Root flex={1} minW={0}>
                <Field.Label>Categoría</Field.Label>
                <NativeSelect.Root disabled={categorias.length === 0}>
                    <NativeSelect.Field
                        value={value.categoriaId ?? ""}
                        onChange={(event) => onChange({
                            ...value,
                            categoriaId: event.target.value === "" ? null : Number(event.target.value),
                        })}
                    >
                        <option value="">Todas las categorías</option>
                        {categorias.map((categoria) => (
                            <option key={categoria.categoriaId} value={categoria.categoriaId}>
                                {categoria.categoriaNombre}
                            </option>
                        ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                </NativeSelect.Root>
                {categorias.length === 0 ? (
                    <Field.HelperText color="app.textMuted">
                        No hay categorías informadas para esta fecha.
                    </Field.HelperText>
                ) : null}
            </Field.Root>
            <Button
                type="button"
                variant="outline"
                mt={{ base: 0, md: 7 }}
                w={{ base: "full", md: "auto" }}
                disabled={value.nombre === "" && value.categoriaId === null}
                onClick={() => onChange({ nombre: "", categoriaId: null })}
            >
                Limpiar filtros
            </Button>
        </Flex>
    );
}
