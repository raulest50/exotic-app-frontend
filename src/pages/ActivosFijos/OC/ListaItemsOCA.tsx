// components/ListaItemsActivos.tsx
import {
    Steps,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Input,
    NumberInput,
    NumberInputField,
    Button,
    IconButton,
    Flex,
    Text,
    Tfoot,
} from "@chakra-ui/react";
import {ItemOrdenCompraActivo} from "../types.tsx"
import {Dispatch, FC, SetStateAction, useMemo, useState} from "react";
import { LuPlus, LuTrash2 } from 'react-icons/lu';

interface Props {
    items: ItemOrdenCompraActivo[];
    setItems: Dispatch<SetStateAction<ItemOrdenCompraActivo[]>>;
}

const ListaItemsOCA: FC<Props> = ({ items, setItems }) => {
    // State to track the next ID to use
    const [nextId, setNextId] = useState(1);

    // add empty row
    const addRow = () => {
        setItems([
            ...items,
            {
                itemOrdenId: nextId,
                nombre: "",
                cantidad: 1,
                precioUnitario: 0,
                ivaPercentage: 0, // Añadido el porcentaje de IVA con valor por defecto 0
                ivaValue: 0,
                subTotal: 0
            }
        ]);
        // Increment the ID for the next row
        setNextId(nextId + 1);
    };

    // remove a row by its unique id
    const removeRow = (id: number) => {
        setItems(items.filter(i => i.itemOrdenId !== id));
    };

    // update a cell and recompute IVA & subtotal
    const updateRow = (
        idx: number,
        field: keyof Omit<ItemOrdenCompraActivo, "itemOrdenId" | "ordenCompraActivoId" | "subTotal" | "ivaValue">,
        raw: string | number
    ) => {
        const newItems = [...items];
        const row = newItems[idx];

        if (field === "cantidad") {
            row.cantidad = Number(raw);
        } else if (field === "precioUnitario") {
            row.precioUnitario = Number(raw);
        } else if (field === "ivaPercentage") {
            row.ivaPercentage = Number(raw);
        } else if (field === "nombre") {
            row.nombre = String(raw);
        }

        // Calcular el valor del IVA basado en el porcentaje y el precio unitario
        row.ivaValue = (row.precioUnitario * row.ivaPercentage) / 100;

        // recompute subTotal
        row.subTotal = (row.precioUnitario + row.ivaValue) * row.cantidad;

        setItems(newItems);
    };

    // Totals
    const { totalIva, totalBeforeIva, totalAfterIva } = useMemo(() => {
        const totIva   = items.reduce((sum, row) => sum + row.ivaValue * row.cantidad, 0);
        const totBase  = items.reduce((sum, row) => sum + row.precioUnitario * row.cantidad, 0);
        const totAll   = items.reduce((sum, row) => sum + row.subTotal, 0);
        return {
            totalIva: totIva,
            totalBeforeIva: totBase,
            totalAfterIva: totAll,
        };
    }, [items]);

    return (
        <Flex direction="column" p="1em" boxShadow="sm" mb="4">
            <Flex justify="space-between" mb="2">
                <Text fontWeight="bold">Items Activos</Text>
                <Button size="sm" onClick={addRow}><LuPlus />Agregar activo
                                    </Button>
            </Flex>

            <Table.Root variant="striped" size="sm">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader w={"35%"}>Descripción</Table.ColumnHeader>
                        <Table.ColumnHeader w={"12%"} textAlign='end'>Precio</Table.ColumnHeader>
                        <Table.ColumnHeader w={"10%"} textAlign='end'>IVA (%)</Table.ColumnHeader>
                        <Table.ColumnHeader w={"12%"} textAlign='end'>IVA ($)</Table.ColumnHeader>
                        <Table.ColumnHeader w={"10%"} textAlign='end'>Cantidad</Table.ColumnHeader>
                        <Table.ColumnHeader w={"15%"} textAlign='end'>Subtotal</Table.ColumnHeader>
                        <Table.ColumnHeader w={"5%"}>Acción</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {items.map((item, idx) => (
                        <Table.Row key={item.itemOrdenId}>
                            <Table.Cell>
                                <Input
                                    size="sm"
                                    value={item.nombre}
                                    onValueChange={e =>
                                        updateRow(idx, "nombre", e.target.value)
                                    }
                                />
                            </Table.Cell>
                            <Table.Cell textAlign='end'>
                                <NumberInput.Root
                                    size="sm"
                                    value={String(item.precioUnitario)}
                                    onValueChange={(_, val) => updateRow(idx, "precioUnitario", val)}
                                    min={0}
                                >
                                    <NumberInput.Input />
                                </NumberInput.Root>
                            </Table.Cell>
                            <Table.Cell textAlign='end'>
                                <NumberInput.Root
                                    size="sm"
                                    value={String(item.ivaPercentage)}
                                    onValueChange={(_, val) => updateRow(idx, "ivaPercentage", val)}
                                    min={0}
                                    max={100}
                                >
                                    <NumberInput.Input />
                                </NumberInput.Root>
                            </Table.Cell>
                            <Table.Cell textAlign='end'>
                                {item.ivaValue.toFixed(2)}
                            </Table.Cell>
                            <Table.Cell textAlign='end'>
                                <NumberInput.Root
                                    size="sm"
                                    value={String(item.cantidad)}
                                    onValueChange={(_, val) => updateRow(idx, "cantidad", val)}
                                    min={1}
                                >
                                    <NumberInput.Input />
                                </NumberInput.Root>
                            </Table.Cell>
                            <Table.Cell textAlign='end'>{item.subTotal.toFixed(2)}</Table.Cell>
                            <Table.Cell>
                                <IconButton
                                    size="xs"
                                    aria-label="Eliminar"
                                    onClick={() => removeRow(item.itemOrdenId)}><LuTrash2 /></IconButton>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>

                <Table.Footer>
                    {/* Total before IVA */}
                    <Table.Row>
                        <Table.Cell colSpan={5} textAlign="right">
                            <strong>Total antes de IVA</strong>
                        </Table.Cell>
                        <Table.Cell fontWeight="bold" textAlign='end'>
                            {totalBeforeIva.toFixed(2)}
                        </Table.Cell>
                        <Table.Cell />
                    </Table.Row>
                    {/* Total IVA row */}
                    <Table.Row>
                        <Table.Cell colSpan={5} textAlign={"right"}>
                            <strong>Total IVA</strong>
                        </Table.Cell>
                        <Table.Cell fontWeight="bold" textAlign='end'>
                            {totalIva.toFixed(2)}
                        </Table.Cell>
                    </Table.Row>
                    {/* Total with IVA */}
                    <Table.Row>
                        <Table.Cell colSpan={5} textAlign={"right"}>
                            <strong>Total despues de IVA</strong>
                        </Table.Cell>
                        <Table.Cell fontWeight="bold" textAlign='end'>{totalAfterIva.toFixed(2)}</Table.Cell>
                        <Table.Cell />
                    </Table.Row>
                </Table.Footer>
            </Table.Root>
        </Flex>
    );
};

export default ListaItemsOCA;
