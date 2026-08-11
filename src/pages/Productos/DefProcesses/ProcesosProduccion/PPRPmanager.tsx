import {
  Steps,
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import {useState} from 'react';
import {RecursoProduccion} from '../../types.tsx';
import RecursoProduccionPicker from './RecursoProduccionPicker.tsx';

interface Props {
  recursos: RecursoProduccion[];
  onChange: (recursos: RecursoProduccion[]) => void;
  editMode?: boolean;
}

export default function PPRPmanager({recursos, onChange, editMode = true}: Props){
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleRemove = (r: RecursoProduccion) => {
    onChange(recursos.filter(a => a.id !== r.id));
  };

  const assignRecursos = (lista: RecursoProduccion[]) => {
    // Asignar cantidad inicial de 1 a cada recurso nuevo
    const nuevosRecursos = lista.map(r => ({...r, cantidad: 1}));
    onChange([...recursos, ...nuevosRecursos]);
  };

  const handleCantidadChange = (id: number | undefined, nuevaCantidad: number) => {
    if (!id) return;

    // Asegurar que la cantidad no sea menor a 1
    const cantidad = Math.max(1, nuevaCantidad);

    // Verificar que no exceda la cantidad de activos fijos disponibles
    const recurso = recursos.find(r => r.id === id);
    if (recurso && recurso.cantidadDisponible && cantidad > recurso.cantidadDisponible) {
      // No permitir exceder la cantidad disponible
      return;
    }

    onChange(recursos.map(r => 
      r.id === id ? {...r, cantidad} : r
    ));
  };

  return (
    <Box>
      <Flex justify="space-between" mb={2}>
        <Button colorPalette='teal' size='sm' onClick={()=>setIsPickerOpen(true)} disabled={!editMode}>Agregar Recurso</Button>
      </Flex>
      <Table.Root size='sm'>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>ID</Table.ColumnHeader>
            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
            <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
            <Table.ColumnHeader>Disponibles</Table.ColumnHeader>
            <Table.ColumnHeader></Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {recursos.map(r=> (
            <Table.Row key={r.id}>
              <Table.Cell>{r.id}</Table.Cell>
              <Table.Cell>{r.nombre}</Table.Cell>
              <Table.Cell>
                <NumberInput.Root 
                  size="sm" 
                  min={1} 
                  max={r.cantidadDisponible || 999} 
                  value={String(r.cantidad || 1)}
                  onValueChange={(_, valueAsNumber) => handleCantidadChange(r.id, valueAsNumber)}
                  disabled={!editMode}
                >
                  <NumberInput.Input />
                  <NumberInput.Control>
                    <NumberInput.IncrementTrigger />
                    <NumberInput.DecrementTrigger />
                  </NumberInput.Control>
                </NumberInput.Root>
              </Table.Cell>
              <Table.Cell>{r.cantidadDisponible || 'N/A'}</Table.Cell>
              <Table.Cell><Button size='xs' colorPalette='red' onClick={()=>handleRemove(r)} disabled={!editMode}>Remover</Button></Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <RecursoProduccionPicker
        isOpen={isPickerOpen}
        onClose={()=>setIsPickerOpen(false)}
        onConfirm={(sel)=>{assignRecursos(sel); setIsPickerOpen(false);}}
        alreadySelected={recursos}
      />
    </Box>
  );
}
