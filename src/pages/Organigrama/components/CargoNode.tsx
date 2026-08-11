import { useCallback, type CSSProperties } from "react";
import { useColorModeValue } from "../../../components/ui/color-mode";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Steps, Box, Flex, HStack, Icon, IconButton, Menu, Text, VStack, Portal } from "@chakra-ui/react";
import { FaUserTie } from "react-icons/fa";
import { LuMousePointerClick } from "react-icons/lu";
import { MdBusinessCenter, MdEdit, MdInfoOutline } from "react-icons/md";
import { AccessLevel, type OrganigramaNode } from "../types";

const handleStyle: CSSProperties = { width: "0.8em", height: "0.8em" };

export default function CargoNode(props: NodeProps<OrganigramaNode>) {
  const cargo = props.data;
  const canEdit = cargo.accessLevel === AccessLevel.EDIT || cargo.isMaster;
  const actionHoverBg = useColorModeValue("blue.50", "blue.900");
  const assignedUserColor = useColorModeValue("blue.600", "blue.200");

  const handleEdit = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      cargo.onEdit(props.id);
    },
    [cargo, props.id],
  );

  const handleViewDetails = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      cargo.onViewDetails(props.id);
    },
    [cargo, props.id],
  );

  return (
    <Box
      border="2px solid"
      borderColor="blue.500"
      borderRadius="md"
      boxShadow={props.selected ? "0 0 10px gold" : ""}
      transition="box-shadow 0.1s ease"
      _hover={{ boxShadow: props.selected ? "0 0 10px gold" : "0 0 10px blue" }}
      w="220px"
      bg="app.surface"
    >
      <Flex direction="column" align="center">
        <Box w="full" p="0.5em" bg="blue.500" color="white">
          <Text fontWeight="bold" textAlign="center">
            {cargo.tituloCargo || "Cargo sin título"}
          </Text>
        </Box>

        <Icon w="3em" h="3em" color="blue.500" my="0.5em" asChild><FaUserTie /></Icon>

        <VStack w="full" p="0.5em" align="start" gap={1} position="relative">
          <HStack w="full">
            <Icon color="blue.500" asChild><MdBusinessCenter /></Icon>
            <Text fontSize="sm" fontWeight="medium">
              {cargo.departamento || "Sin departamento"}
            </Text>
          </HStack>

          <Text fontSize="xs" color="app.textMuted" lineClamp={2} minH="2.4em">
            {cargo.descripcionCargo || "Sin descripción"}
          </Text>

          {cargo.usuario && (
            <Text fontSize="xs" color={assignedUserColor}>
              Usuario: {cargo.usuario}
            </Text>
          )}

          <Box position="absolute" bottom="2px" right="2px" className="nodrag">
            <Menu.Root>
              <Menu.Trigger
                aria-label="Opciones del cargo"
                icon={<LuMousePointerClick />}
                variant="ghost"
                size="lg"
                color="blue.500"
                _hover={{ bg: actionHoverBg }}
                asChild><IconButton
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => event.stopPropagation()} /></Menu.Trigger>
              <Portal><Menu.Positioner><Menu.Content>
                    {canEdit && (
                      <Menu.Item icon={<MdEdit />} onSelect={handleEdit} value='item-0'>
                        Editar cargo
                      </Menu.Item>
                    )}
                    <Menu.Item icon={<MdInfoOutline />} onSelect={handleViewDetails} value='item-1'>
                      Detalles y manual
                    </Menu.Item>
                  </Menu.Content></Menu.Positioner></Portal>
            </Menu.Root>
          </Box>
        </VStack>

        <Handle
          type="target"
          position={Position.Top}
          id="target"
          style={handleStyle}
          isConnectable={canEdit}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="source"
          style={handleStyle}
          isConnectable={canEdit}
        />
      </Flex>
    </Box>
  );
}
