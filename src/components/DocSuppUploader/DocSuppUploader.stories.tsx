import React, { useState } from 'react';
import { DocSuppUploader } from './DocSuppUploader';
import { Box, Text } from '@chakra-ui/react';

export const Default = () => {
  const [file, setFile] = useState<File | null>(null);

  return (
    <Box maxWidth="600px" p="20px">
      <DocSuppUploader
        setFile={setFile}
        allowedExtensions={{ '.pdf': true, '.jpg': true, '.jpeg': true, '.png': true }}
      />
      {file && (
        <Box mt={4} p={3} bg="green.50" borderRadius="md">
          <Text fontWeight="bold">Archivo seleccionado:</Text>
          <Text>{file.name}</Text>
          <Text>Tamaño: {(file.size / 1024).toFixed(2)} KB</Text>
        </Box>
      )}
    </Box>
  );
};

export const CustomLabels = () => {
  const [file, setFile] = useState<File | null>(null);

  return (
    <Box maxWidth="600px" p="20px">
      <DocSuppUploader
        title="Subir Factura"
        description="Adjunte una imagen o PDF de la factura para continuar con el proceso"
        setFile={setFile}
        allowedExtensions={{ '.pdf': true, '.jpg': true, '.jpeg': true, '.png': true }}
      />
      {file && (
        <Box mt={4} p={3} bg="green.50" borderRadius="md">
          <Text fontWeight="bold">Factura seleccionada:</Text>
          <Text>{file.name}</Text>
        </Box>
      )}
    </Box>
  );
};