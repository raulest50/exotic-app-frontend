import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Button,
  Flex,
  Input,
  NumberInput,
  Grid,
  GridItem,
  InputGroup,
  IconButton,
  Table,
  Box,
  Text,
  Field,
  Dialog,
  Portal,
} from "@chakra-ui/react";
import { useAppToast } from "@/components/ui/use-app-toast";
import EndPointsURL from "../../../../../api/EndPointsURL";
import CustomDecimalInput from "../../../../../components/CustomDecimalInput/CustomDecimalInput.tsx";
import { LuSearch, LuTrash2 } from 'react-icons/lu';

// Interfaces based on backend models
interface CasePack {
  id?: number;
  unitsPerCase: number;
  ean14?: string;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
  grossWeightKg?: number;
  insumosEmpaque: InsumoEmpaque[];
}

interface InsumoEmpaque {
  id?: number;
  material: Material;
  cantidad: number;
}

interface Material {
  productoId: string;
  nombre: string;
  tipoUnidades: string;
  tipoMaterial?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (casePack: CasePack) => void;
}

const PackagingTerminadoDefiner: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const endpoints = new EndPointsURL();
  const toast = useAppToast();

  // State for CasePack data
  const [casePack, setCasePack] = useState<CasePack>({
    unitsPerCase: 0,
    insumosEmpaque: []
  });

  // State for validation errors
  const [errors, setErrors] = useState({
    unitsPerCase: false
  });

  // State for material search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Material[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Validate unitsPerCase
  const validateUnitsPerCase = (value: number) => {
    return value > 0;
  };

  // Handle input changes for CasePack properties
  const handleInputChange = (field: keyof CasePack, value: any) => {
    setCasePack(prev => ({ ...prev, [field]: value }));
    
    // Validate unitsPerCase
    if (field === 'unitsPerCase') {
      setErrors(prev => ({ ...prev, unitsPerCase: !validateUnitsPerCase(value) }));
    }
  };

  // Search for packaging materials
  const searchMaterials = async () => {
    //if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await axios.post(endpoints.consulta_productos, {
        search: searchTerm,
        categories: ["material empaque"], // Filter for packaging materials only
        page: 0,
        size: 10
      });
      
      setSearchResults(response.data.content || []);
    } catch (error) {
      console.error("Error searching materials:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los materiales de empaque",
        status: "error",
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Add material to insumosEmpaque
  const addMaterial = (material: Material) => {
    // Check if material already exists in the list
    const exists = casePack.insumosEmpaque.some(
      insumo => insumo.material.productoId === material.productoId
    );

    if (exists) {
      toast({
        title: "Material ya agregado",
        description: "Este material ya está en la lista",
        status: "warning",
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Add material with default quantity of 1
    setCasePack(prev => ({
      ...prev,
      insumosEmpaque: [
        ...prev.insumosEmpaque,
        {
          material,
          cantidad: 1
        }
      ]
    }));

    // Clear search results
    setSearchResults([]);
    setSearchTerm("");
  };

  // Update quantity for a material
  const updateQuantity = (index: number, quantity: number) => {
    const newInsumosEmpaque = [...casePack.insumosEmpaque];
    newInsumosEmpaque[index].cantidad = quantity;
    
    setCasePack(prev => ({
      ...prev,
      insumosEmpaque: newInsumosEmpaque
    }));
  };

  // Remove material from insumosEmpaque
  const removeMaterial = (index: number) => {
    setCasePack(prev => ({
      ...prev,
      insumosEmpaque: prev.insumosEmpaque.filter((_, i) => i !== index)
    }));
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      validateUnitsPerCase(casePack.unitsPerCase) && 
      casePack.insumosEmpaque.length > 0
    );
  };

  // Handle save
  const handleSave = () => {
    if (isFormValid()) {
      onSave(casePack);
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} size='xl' onOpenChange={e => {
      if (!e.open) {
        onClose();
      }
    }}>
      <Portal>

        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header><Dialog.Title>Definir Packaging de Terminado</Dialog.Title></Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body>
              <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                {/* Left Panel - Material Search and List */}
                <GridItem>
                  <Box borderWidth="1px" borderRadius="lg" p={4}>
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                      Materiales de Empaque
                    </Text>
                    
                    {/* Search Input */}
                    <Field.Root mb={4}>
                      <Field.Label>Buscar Material</Field.Label>
                      <InputGroup
                        endElement={(
                          <IconButton
                            aria-label="Buscar material"
                            size="sm"
                            onClick={searchMaterials}
                            loading={isSearching}
                          >
                            <LuSearch />
                          </IconButton>
                        )}
                      >
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Nombre del material"
                        />
                      </InputGroup>
                    </Field.Root>
                    
                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <Box mb={4} maxH="200px" overflowY="auto" borderWidth="1px" borderRadius="md">
                        <Table.Root size="sm">
                          <Table.Header>
                            <Table.Row>
                              <Table.ColumnHeader>Código</Table.ColumnHeader>
                              <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                              <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                              <Table.ColumnHeader></Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {searchResults.map((material) => (
                              <Table.Row key={material.productoId}>
                                <Table.Cell>{material.productoId}</Table.Cell>
                                <Table.Cell>{material.nombre}</Table.Cell>
                                <Table.Cell>{material.tipoUnidades}</Table.Cell>
                                <Table.Cell>
                                  <Button
                                    size="xs"
                                    colorPalette="blue"
                                    onClick={() => addMaterial(material)}
                                  >
                                    Agregar
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    )}
                    
                    {/* Selected Materials Table */}
                    <Box maxH="300px" overflowY="auto">
                      <Table.Root size="sm">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeader>Código</Table.ColumnHeader>
                            <Table.ColumnHeader>Nombre</Table.ColumnHeader>
                            <Table.ColumnHeader>Unidad</Table.ColumnHeader>
                            <Table.ColumnHeader>Cantidad</Table.ColumnHeader>
                            <Table.ColumnHeader></Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {casePack.insumosEmpaque.map((insumo, index) => (
                            <Table.Row key={index}>
                              <Table.Cell>{insumo.material.productoId}</Table.Cell>
                              <Table.Cell>{insumo.material.nombre}</Table.Cell>
                              <Table.Cell>{insumo.material.tipoUnidades}</Table.Cell>
                              <Table.Cell>
                                <CustomDecimalInput
                                  value={insumo.cantidad}
                                  onChange={(newCantidad) => updateQuantity(index, newCantidad)}
                                  min={0.1}
                                  maxDecimals={1}
                                  size="sm"
                                  w="80px"
                                />
                              </Table.Cell>
                              <Table.Cell>
                                <IconButton
                                  aria-label="Eliminar material"
                                  size="sm"
                                  colorPalette="red"
                                  onClick={() => removeMaterial(index)}><LuTrash2 /></IconButton>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </Box>
                  </Box>
                </GridItem>
                
                {/* Right Panel - CasePack Properties */}
                <GridItem>
                  <Box borderWidth="1px" borderRadius="lg" p={4}>
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                      Propiedades del Empaque
                    </Text>
                    
                    {/* Units Per Case */}
                    <Field.Root invalid={errors.unitsPerCase} mb={4} required>
                      <Field.Label>Unidades por Caja</Field.Label>
                      <NumberInput.Root
                        min={1}
                        value={String(casePack.unitsPerCase)}
                        onValueChange={({ valueAsNumber }) => handleInputChange('unitsPerCase', valueAsNumber)}
                      >
                        <NumberInput.Input />
                      </NumberInput.Root>
                      <Field.ErrorText>
                        El valor debe ser mayor que cero
                      </Field.ErrorText>
                    </Field.Root>
                    
                    {/* EAN14 */}
                    <Field.Root mb={4}>
                      <Field.Label>EAN14 / ITF-14</Field.Label>
                      <Input
                        value={casePack.ean14 || ""}
                        onChange={(e) => handleInputChange('ean14', e.target.value)}
                        placeholder="Código EAN14"
                      />
                    </Field.Root>
                    
                    {/* Dimensions */}
                    <Flex gap={4} mb={4}>
                      <Field.Root>
                        <Field.Label>Largo (cm)</Field.Label>
                        <NumberInput.Root
                          min={0}
                          value={String(casePack.largoCm || "")}
                          onValueChange={({ valueAsNumber }) => handleInputChange('largoCm', valueAsNumber)}
                        >
                          <NumberInput.Input />
                        </NumberInput.Root>
                      </Field.Root>
                      
                      <Field.Root>
                        <Field.Label>Ancho (cm)</Field.Label>
                        <NumberInput.Root
                          min={0}
                          value={String(casePack.anchoCm || "")}
                          onValueChange={({ valueAsNumber }) => handleInputChange('anchoCm', valueAsNumber)}
                        >
                          <NumberInput.Input />
                        </NumberInput.Root>
                      </Field.Root>
                      
                      <Field.Root>
                        <Field.Label>Alto (cm)</Field.Label>
                        <NumberInput.Root
                          min={0}
                          value={String(casePack.altoCm || "")}
                          onValueChange={({ valueAsNumber }) => handleInputChange('altoCm', valueAsNumber)}
                        >
                          <NumberInput.Input />
                        </NumberInput.Root>
                      </Field.Root>
                    </Flex>
                    
                    {/* Gross Weight */}
                    <Field.Root mb={4}>
                      <Field.Label>Peso Bruto (kg)</Field.Label>
                      <NumberInput.Root
                        min={0}
                        value={String(casePack.grossWeightKg || "")}
                        onValueChange={({ valueAsNumber }) => handleInputChange('grossWeightKg', valueAsNumber)}
                      >
                        <NumberInput.Input />
                      </NumberInput.Root>
                    </Field.Root>
                  </Box>
                </GridItem>
              </Grid>
            </Dialog.Body>

            <Dialog.Footer>
              <Button colorPalette="gray" mr={3} onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                colorPalette="blue" 
                onClick={handleSave}
                disabled={!isFormValid()}
              >
                Aceptar
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>

      </Portal>
    </Dialog.Root>
  );
};

export default PackagingTerminadoDefiner;
