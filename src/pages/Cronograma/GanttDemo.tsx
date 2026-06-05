import { Box, useColorModeValue } from "@chakra-ui/react";
import { Gantt } from "wx-react-gantt";
import "wx-react-gantt/dist/gantt.css";

const tasks = [
  {
    id: 1,
    text: "Base Neutra",
    start: new Date(2024, 6, 22, 8),
    end: new Date(2024, 6, 22, 16),
    progress: 0,
    type: "task",
  },
  {
    id: 2,
    text: "Semiterminados",
    start: new Date(2024, 6, 22, 8),
    end: new Date(2024, 6, 23, 12),
    progress: 0,
    type: "task",
  },
  {
    id: 3,
    text: "Envases con Termoencogible",
    start: new Date(2024, 6, 23, 8),
    end: new Date(2024, 6, 24, 12),
    progress: 0,
    type: "task",
  },
  {
    id: 4,
    text: "Producto Terminado",
    start: new Date(2024, 6, 24, 14),
    end: new Date(2024, 6, 25, 18),
    progress: 0,
    type: "task",
  },
  {
    id: 5,
    text: "Empaque y Despacho",
    start: new Date(2024, 6, 25, 8),
    end: new Date(2024, 6, 26, 12),
    progress: 0,
    type: "task",
  },
];

const scales = [
  { unit: "day", step: 1, format: "MMM dd" },
  { unit: "hour", step: 4, format: "HH" },
];

export default function GanttDemo() {
  const ganttThemeClass = useColorModeValue("wx-willow-theme", "wx-willow-dark-theme");

  return (
    <Box w="full" h="500px" className={ganttThemeClass}>
      <Gantt tasks={tasks} scales={scales} containerClassName={ganttThemeClass} />
    </Box>
  );
}
