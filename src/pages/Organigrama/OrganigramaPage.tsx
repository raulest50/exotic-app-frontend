import { useMemo, useState, type JSX } from "react";
import { useColorModeValue } from "../../components/ui/color-mode";
import {
  Container,
  Box,
  Spinner,
  Center,
  Text,
  Flex,
  IconButton,
  Tabs,
  Collapsible,
  useDisclosure,
} from "@chakra-ui/react";
import MyHeader from "../../components/MyHeader.tsx";
import OrganizationChart from "./components/OrganizationChart";
import { MisionVision } from "./MisionVision";
import { AccessLevel } from "./types";
import { useAuth } from "../../context/AuthContext";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { useTabPermission } from "../../auth/usePermissions";
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

export default function OrganigramaPage() {
  const { accesosReady, isMasterLike } = useAuth();
  const organigramaPermission = useTabPermission(Modulo.ORGANIGRAMA, "ORGANIGRAMA");
  const misionVisionPermission = useTabPermission(Modulo.ORGANIGRAMA, "MISION_VISION");

  const accessLevel = useMemo((): AccessLevel => {
    if (organigramaPermission.nivel >= AccessLevel.EDIT) return AccessLevel.EDIT;
    if (organigramaPermission.nivel >= AccessLevel.VIEW) return AccessLevel.VIEW;
    return AccessLevel.VIEW;
  }, [organigramaPermission.nivel]);

  const isLoading = !accesosReady;
  const organizationChartId = "org-1";
  const { open, onToggle } = useDisclosure({ defaultOpen: true });
  const [tabIndex, setTabIndex] = useState(0);
  const [organigramaDirty, setOrganigramaDirty] = useState(false);
  const tabHoverBg = useColorModeValue("blue.50", "blue.900");
  const tabHoverColor = useColorModeValue("blue.600", "blue.200");
  const tabSelectedBg = useColorModeValue("blue.100", "blue.800");
  const tabSelectedColor = useColorModeValue("blue.700", "blue.200");

  const tabs: Array<{ key: string; label: string; render: () => JSX.Element; canSee: boolean }> = [
    {
      key: "organigrama",
      label: "Organigrama",
      render: () => (
        <OrganizationChart
          accessLevel={accessLevel}
          isMaster={isMasterLike}
          organizationChartId={organizationChartId}
          onDirtyChange={setOrganigramaDirty}
        />
      ),
      canSee: organigramaPermission.canSee,
    },
    {
      key: "mision-vision",
      label: "Mision y Vision",
      render: () => <MisionVision canEdit={misionVisionPermission.nivel >= AccessLevel.EDIT} />,
      canSee: misionVisionPermission.canSee,
    },
  ];

  const visibleTabs = tabs.filter((tab) => tab.canSee);
  const safeTabIndex = Math.min(tabIndex, Math.max(visibleTabs.length - 1, 0));
  const activeTabKey = visibleTabs[safeTabIndex]?.key ?? "";
  const handleTabChange = ({ value }: { value: string }) => {
    const nextIndex = visibleTabs.findIndex((tab) => tab.key === value);
    if (nextIndex < 0) return;
    const currentTab = visibleTabs[safeTabIndex];
    const nextTab = visibleTabs[nextIndex];
    if (
      currentTab?.key === "organigrama" &&
      nextTab?.key !== "organigrama" &&
      organigramaDirty &&
      !window.confirm("Hay cambios sin guardar en el organigrama. ¿Cambiar de pestaña y descartarlos?")
    ) {
      return;
    }
    setTabIndex(nextIndex);
  };

  return (
    <Container minW={["auto", "container.lg", "container.xl"]} minH={"100vh"} w={"full"} h={"full"}>
      <MyHeader title={"Organigrama"} />

      {isLoading ? (
        <Center h="70vh">
          <Spinner size="xl" />
        </Center>
      ) : !organizationChartId ? (
        <Box p={8}>
          <Text>No se encontro ningun organigrama disponible.</Text>
        </Box>
      ) : visibleTabs.length === 0 ? (
        <Box p={8}>
          <Text>No tienes acceso a ninguna tab de este modulo.</Text>
        </Box>
      ) : (
        <Flex>
          <Flex direction="column" bg="app.surface" borderRight="1px" borderColor="app.border" position="relative">
            <IconButton
              aria-label={open ? "Colapsar panel" : "Expandir panel"}
              position="absolute"
              right="-16px"
              top="50%"
              transform="translateY(-50%)"
              zIndex="1"
              size="sm"
              onClick={onToggle}
              borderRadius="full"
              boxShadow="md">{open ? <LuChevronLeft /> : <LuChevronRight />}</IconButton>

            <Collapsible.Root open={open}>
              <Collapsible.Content>
                <Box w="250px" p={4}>
                  <Tabs.Root unstyled colorPalette="blue" orientation="vertical" value={activeTabKey} onValueChange={handleTabChange}>
                    <Tabs.List mb="1em" gap={3}>
                      {visibleTabs.map((tab) => (
                        <Tabs.Trigger
                          key={tab.key}
                          value={tab.key}
                          py={3}
                          px={4}
                          borderRadius="md"
                          fontWeight="medium"
                          _hover={{ bg: tabHoverBg, color: tabHoverColor }}
                          _selected={{ bg: tabSelectedBg, color: tabSelectedColor, fontWeight: "bold" }}
                          transition="all 0.2s"
                        >
                          {tab.label}
                        </Tabs.Trigger>
                      ))}
                    </Tabs.List>
                  </Tabs.Root>
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          </Flex>

          <Box flex="1" ml={open ? 4 : 0}>
            <Tabs.Root variant='outline' colorPalette="blue" lazyMount value={activeTabKey} onValueChange={handleTabChange}>
              <Tabs.List display="none">
                {visibleTabs.map((tab) => (
                  <Tabs.Trigger key={tab.key} value={tab.key}>{tab.label}</Tabs.Trigger>
                ))}
              </Tabs.List>
              {visibleTabs.map((tab) => (
                  <Tabs.Content key={tab.key} value={tab.key} p={0}>
                    {tab.render()}
                  </Tabs.Content>
              ))}
            </Tabs.Root>
          </Box>
        </Flex>
      )}
    </Container>
  );
}
