import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { StoryDefault } from "@ladle/react";
import {
  Background,
  Position,
  ReactFlow,
  applyNodeChanges,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Box, Button, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

import "@xyflow/react/dist/style.css";

import FloatingLines from "@/components/FloatingLines/FloatingLines";
import SplitText from "@/components/SplitText";
import RichTextEditor from "@/pages/Organigrama/components/RichTextEditor";

const CHARACTERIZATION_COPY = "Caracterización determinista y aislada para validar React 18 y React 19.";

const StoryFrame = ({ children, title, testId }: { children: ReactNode; title: string; testId: string }) => (
  <Box data-testid={testId} minH="100vh" bg="app.surfaceSubtle" color="fg" p={{ base: 4, md: 8 }}>
    <VStack align="stretch" gap={6} maxW="960px" mx="auto">
      <Box>
        <Heading as="h1" size="xl">
          {title}
        </Heading>
        <Text mt={2} color="app.textMuted" fontSize="sm">
          {CHARACTERIZATION_COPY}
        </Text>
      </Box>
      {children}
    </VStack>
  </Box>
);

const MountToggle = ({
  controls,
  label,
  mounted,
  onToggle,
}: {
  controls: string;
  label: string;
  mounted: boolean;
  onToggle: () => void;
}) => (
  <Button
    type="button"
    alignSelf="flex-start"
    aria-controls={controls}
    aria-expanded={mounted}
    onClick={onToggle}
  >
    {mounted ? `Desmontar ${label}` : `Montar ${label}`}
  </Button>
);

const UnmountedState = ({ label, testId }: { label: string; testId: string }) => (
  <Flex
    data-testid={testId}
    role="status"
    minH="120px"
    align="center"
    justify="center"
    bg="app.surface"
    borderWidth="1px"
    borderRadius="md"
  >
    <Text color="app.textMuted">{label} está desmontado.</Text>
  </Flex>
);

export default {
  title: "React Compatibility Characterization",
} satisfies StoryDefault;

const TIPTAP_INITIAL_HTML = "<p>Texto editable de compatibilidad</p>";

export const Tiptap = () => {
  const [html, setHtml] = useState(TIPTAP_INITIAL_HTML);
  const [mounted, setMounted] = useState(true);
  const hasBoldText = html.includes("<strong>");

  return (
    <StoryFrame title="Tiptap" testId="react-compat-tiptap">
      <MountToggle
        controls="tiptap-harness"
        label="Tiptap"
        mounted={mounted}
        onToggle={() => setMounted(currentMounted => !currentMounted)}
      />
      {mounted ? (
        <Box id="tiptap-harness">
          <RichTextEditor
            value={html}
            onChange={setHtml}
            ariaLabel="Contenido de caracterización Tiptap"
          />
        </Box>
      ) : (
        <UnmountedState label="Tiptap" testId="tiptap-unmounted" />
      )}
      <Box bg="app.surface" borderWidth="1px" borderRadius="md" p={4}>
        <Text fontWeight="semibold">Estado observable</Text>
        <Text data-testid="tiptap-bold-state" mt={1}>
          {hasBoldText ? "Negrita activa" : "Negrita inactiva"}
        </Text>
        <Text
          as="output"
          data-testid="tiptap-html"
          display="block"
          mt={2}
          color="app.textMuted"
          fontFamily="mono"
          fontSize="sm"
        >
          {html}
        </Text>
      </Box>
    </StoryFrame>
  );
};

const initialFlowNodes: Node[] = [
  {
    id: "source",
    position: { x: 70, y: 110 },
    data: { label: <span data-testid="xyflow-node-source">Origen</span> },
    ariaLabel: "Nodo Origen",
    sourcePosition: Position.Right,
  },
  {
    id: "target",
    position: { x: 560, y: 110 },
    data: { label: <span data-testid="xyflow-node-target">Destino</span> },
    ariaLabel: "Nodo Destino",
    targetPosition: Position.Left,
  },
];

const initialFlowEdges: Edge[] = [
  { id: "source-target", source: "source", target: "target", animated: false },
];

export const XYFlow = () => {
  const [nodes, setNodes] = useState<Node[]>(initialFlowNodes);
  const [lastMove, setLastMove] = useState("Ningún nodo movido");
  const [mounted, setMounted] = useState(true);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(currentNodes => applyNodeChanges(changes, currentNodes)),
    [],
  );

  return (
    <StoryFrame title="XYFlow" testId="react-compat-xyflow">
      <MountToggle
        controls="xyflow-harness"
        label="XYFlow"
        mounted={mounted}
        onToggle={() => setMounted(currentMounted => !currentMounted)}
      />
      {mounted ? (
        <Box
          id="xyflow-harness"
          h="360px"
          bg="app.surface"
          borderWidth="1px"
          borderRadius="md"
          overflow="hidden"
        >
          <ReactFlow
            nodes={nodes}
            edges={initialFlowEdges}
            onNodesChange={handleNodesChange}
            onNodeDragStop={(_event, node) => {
              setLastMove(`${node.id}: ${Math.round(node.position.x)}, ${Math.round(node.position.y)}`);
            }}
            fitView
            minZoom={0.5}
            maxZoom={1.5}
            nodesConnectable={false}
            elementsSelectable
          >
            <Background gap={20} size={1} />
          </ReactFlow>
        </Box>
      ) : (
        <UnmountedState label="XYFlow" testId="xyflow-unmounted" />
      )}
      <Text as="output" data-testid="xyflow-last-move" aria-live="polite">
        {lastMove}
      </Text>
    </StoryFrame>
  );
};

interface SortableCharacterizationItem {
  id: "alpha" | "beta" | "gamma";
  label: string;
}

const initialSortableItems: SortableCharacterizationItem[] = [
  { id: "alpha", label: "Tarea Alfa" },
  { id: "beta", label: "Tarea Beta" },
  { id: "gamma", label: "Tarea Gamma" },
];

const SortableItem = ({ item }: { item: SortableCharacterizationItem }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style: CSSProperties = {
    opacity: isDragging ? 0.65 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <Flex
      ref={setNodeRef}
      data-testid={`dnd-item-${item.id}`}
      style={style}
      align="center"
      justify="space-between"
      gap={4}
      bg="app.surface"
      borderWidth="1px"
      borderRadius="md"
      p={4}
    >
      <Text fontWeight="semibold">{item.label}</Text>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={`Mover ${item.label}`}
        cursor={isDragging ? "grabbing" : "grab"}
        {...attributes}
        {...listeners}
      >
        Mover
      </Button>
    </Flex>
  );
};

const DndKitHarness = () => {
  const [items, setItems] = useState<SortableCharacterizationItem[]>(initialSortableItems);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setItems(currentItems => {
      const oldIndex = currentItems.findIndex(item => item.id === active.id);
      const newIndex = currentItems.findIndex(item => item.id === over.id);
      return arrayMove(currentItems, oldIndex, newIndex);
    });
  };

  return (
    <Box id="dnd-kit-harness">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <VStack align="stretch" gap={3}>
            {items.map(item => (
              <SortableItem key={item.id} item={item} />
            ))}
          </VStack>
        </SortableContext>
      </DndContext>
      <Text as="output" data-testid="dnd-order" aria-live="polite">
        {items.map(item => item.id).join(" > ")}
      </Text>
    </Box>
  );
};

export const DndKit = () => {
  const [mounted, setMounted] = useState(true);

  return (
    <StoryFrame title="DnD Kit" testId="react-compat-dnd">
      <MountToggle
        controls="dnd-kit-harness"
        label="DnD Kit"
        mounted={mounted}
        onToggle={() => setMounted(currentMounted => !currentMounted)}
      />
      {mounted ? (
        <DndKitHarness />
      ) : (
        <UnmountedState label="DnD Kit" testId="dnd-kit-unmounted" />
      )}
    </StoryFrame>
  );
};

const chartOption: EChartsOption = {
  animation: false,
  grid: { left: 48, right: 24, top: 24, bottom: 40 },
  xAxis: {
    type: "category",
    data: ["Alfa", "Beta", "Gamma"],
  },
  yAxis: {
    type: "value",
    min: 0,
    max: 20,
  },
  series: [
    {
      name: "Compatibilidad",
      type: "bar",
      data: [8, 13, 5],
      itemStyle: { color: "#3182ce" },
    },
  ],
};

export const ECharts = () => {
  const chartRef = useRef<ReactECharts | null>(null);
  const [mounted, setMounted] = useState(true);
  const [wide, setWide] = useState(false);
  const [resizeCount, setResizeCount] = useState(0);

  useEffect(() => {
    if (!mounted) return;

    const frame = window.requestAnimationFrame(() => {
      chartRef.current?.getEchartsInstance().resize();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mounted, wide]);

  const toggleSize = () => {
    setWide(currentWide => !currentWide);
    setResizeCount(currentCount => currentCount + 1);
  };

  const toggleMounted = () => {
    setMounted(currentMounted => !currentMounted);
  };

  const chartStatus = mounted
    ? `Gráfico montado · tamaño ${wide ? "amplio" : "compacto"} · cambios de tamaño: ${resizeCount}`
    : `Gráfico desmontado · cambios de tamaño: ${resizeCount}`;

  return (
    <StoryFrame title="ECharts" testId="react-compat-echarts">
      <HStack gap={3} flexWrap="wrap">
        <Button type="button" onClick={toggleSize} disabled={!mounted}>
          Cambiar tamaño
        </Button>
        <Button type="button" variant="outline" onClick={toggleMounted}>
          {mounted ? "Desmontar gráfico" : "Montar gráfico"}
        </Button>
      </HStack>
      <Box
        data-testid="echarts-container"
        role={mounted ? "img" : "status"}
        aria-label={mounted ? "Gráfico de barras de compatibilidad" : "El gráfico está desmontado"}
        style={{ width: wide ? "720px" : "480px", maxWidth: "100%", alignSelf: "flex-start" }}
        h="320px"
        bg="app.surface"
        borderWidth="1px"
        borderRadius="md"
        overflow="hidden"
      >
        {mounted ? (
          <ReactECharts ref={chartRef} option={chartOption} style={{ height: "100%", width: "100%" }} />
        ) : (
          <Flex h="full" align="center" justify="center">
            <Text color="app.textMuted">El gráfico está desmontado.</Text>
          </Flex>
        )}
      </Box>
      <Text as="output" data-testid="echarts-status" aria-live="polite">
        {chartStatus}
      </Text>
    </StoryFrame>
  );
};

const THREE_ENABLED_WAVES: Array<"top" | "middle" | "bottom"> = ["middle"];
const THREE_LINES_GRADIENT = ["#3182ce", "#805ad5"];
const THREE_MIDDLE_POSITION = { x: 0, y: 0, rotate: 0 };

export const Three = () => {
  const [mounted, setMounted] = useState(true);

  return (
    <StoryFrame title="Three / FloatingLines" testId="react-compat-three">
      <MountToggle
        controls="three-surface"
        label="Three"
        mounted={mounted}
        onToggle={() => setMounted(currentMounted => !currentMounted)}
      />
      {mounted ? (
        <Box
          id="three-surface"
          data-testid="three-surface"
          role="img"
          aria-label="Líneas de compatibilidad renderizadas con Three"
          h="320px"
          bg="app.surface"
          borderWidth="1px"
          borderRadius="md"
          overflow="hidden"
          css={{ "& .floating-lines-container": { minHeight: "100%" } }}
        >
          <FloatingLines
            enabledWaves={THREE_ENABLED_WAVES}
            lineCount={3}
            lineDistance={6}
            linesGradient={THREE_LINES_GRADIENT}
            middleWavePosition={THREE_MIDDLE_POSITION}
            animationSpeed={0}
            interactive={false}
            parallax={false}
            lineBoost={0.7}
            lineOpacity={0.8}
          />
        </Box>
      ) : (
        <UnmountedState label="Three" testId="three-unmounted" />
      )}
    </StoryFrame>
  );
};

export const FramerMotion = () => {
  const [mounted, setMounted] = useState(true);

  return (
    <StoryFrame title="Framer Motion / SplitText" testId="react-compat-framer-motion">
      <MountToggle
        controls="framer-motion-surface"
        label="Framer Motion"
        mounted={mounted}
        onToggle={() => setMounted(currentMounted => !currentMounted)}
      />
      {mounted ? (
        <Flex
          id="framer-motion-surface"
          minH="180px"
          align="center"
          justify="center"
          bg="app.surface"
          borderWidth="1px"
          borderRadius="md"
          p={6}
        >
          <SplitText
            data-testid="framer-motion-text"
            text="Compatibilidad React Framer Motion"
            type="words"
            delay={0}
            duration={0}
            aria-label="Compatibilidad React Framer Motion"
          />
        </Flex>
      ) : (
        <UnmountedState label="Framer Motion" testId="framer-motion-unmounted" />
      )}
    </StoryFrame>
  );
};
