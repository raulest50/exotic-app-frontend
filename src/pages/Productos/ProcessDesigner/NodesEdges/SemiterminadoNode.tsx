import type { Node, NodeProps } from "@xyflow/react";
import { FiLayers } from "react-icons/fi";
import { InputNodeCard, type InputNodeData } from "./MaterialNode.tsx";

export type SemiterminadoFlowNode = Node<InputNodeData, "semiterminado">;

export default function SemiterminadoNode({ data, selected, isConnectable }: NodeProps<SemiterminadoFlowNode>) {
    return <InputNodeCard data={data} selected={selected} isConnectable={isConnectable}
        palette="purple" label="Semiterminado" icon={<FiLayers />} />;
}
