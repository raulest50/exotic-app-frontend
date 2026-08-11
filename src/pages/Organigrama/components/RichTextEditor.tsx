import { useEffect } from "react";
import { useColorModeValue } from "../../../components/ui/color-mode";
import { Box, ButtonGroup, IconButton } from "@chakra-ui/react";
import { Tooltip } from '@/components/ui/tooltip';
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {
  FaAlignCenter,
  FaAlignJustify,
  FaAlignLeft,
  FaAlignRight,
  FaBold,
  FaItalic,
  FaLink,
  FaListOl,
  FaListUl,
  FaRedo,
  FaUnderline,
  FaUndo,
  FaUnlink,
} from "react-icons/fa";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
}

export default function RichTextEditor({ value, onChange, ariaLabel }: RichTextEditorProps) {
  const editorBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        strike: false,
        link: {
          autolink: true,
          openOnClick: false,
          defaultProtocol: "https",
        },
      }),
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content: value,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": ariaLabel,
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const currentHref = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("URL del enlace (http, https o mailto)", currentHref ?? "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  };

  const toolbarButton = (
    label: string,
    icon: JSX.Element,
    action: () => void,
    active = false,
    disabled = false
  ) => (
    <Tooltip content={label} key={label} showArrow>
      <IconButton
        aria-label={label}
        size="sm"
        variant={active ? "solid" : "ghost"}
        colorPalette={active ? "blue" : "gray"}
        onClick={action}
        disabled={!editor || disabled}>{icon}</IconButton>
    </Tooltip>
  );

  return (
    <Box borderWidth="1px" borderColor={borderColor} borderRadius="md" overflow="hidden" bg={editorBg}>
      <ButtonGroup
        size="sm"
        gap={1}
        p={2}
        borderBottomWidth="1px"
        borderColor={borderColor}
        flexWrap="wrap"
      >
        {toolbarButton("Negrita", <FaBold />, () => editor?.chain().focus().toggleBold().run(), editor?.isActive("bold"))}
        {toolbarButton("Cursiva", <FaItalic />, () => editor?.chain().focus().toggleItalic().run(), editor?.isActive("italic"))}
        {toolbarButton("Subrayado", <FaUnderline />, () => editor?.chain().focus().toggleUnderline().run(), editor?.isActive("underline"))}
        {toolbarButton("Lista con viñetas", <FaListUl />, () => editor?.chain().focus().toggleBulletList().run(), editor?.isActive("bulletList"))}
        {toolbarButton("Lista numerada", <FaListOl />, () => editor?.chain().focus().toggleOrderedList().run(), editor?.isActive("orderedList"))}
        {toolbarButton("Alinear a la izquierda", <FaAlignLeft />, () => editor?.chain().focus().setTextAlign("left").run(), editor?.isActive({ textAlign: "left" }))}
        {toolbarButton("Centrar", <FaAlignCenter />, () => editor?.chain().focus().setTextAlign("center").run(), editor?.isActive({ textAlign: "center" }))}
        {toolbarButton("Alinear a la derecha", <FaAlignRight />, () => editor?.chain().focus().setTextAlign("right").run(), editor?.isActive({ textAlign: "right" }))}
        {toolbarButton("Justificar", <FaAlignJustify />, () => editor?.chain().focus().setTextAlign("justify").run(), editor?.isActive({ textAlign: "justify" }))}
        {toolbarButton("Agregar enlace", <FaLink />, setLink, editor?.isActive("link"))}
        {toolbarButton("Quitar enlace", <FaUnlink />, () => editor?.chain().focus().unsetLink().run(), false, !editor?.isActive("link"))}
        {toolbarButton("Deshacer", <FaUndo />, () => editor?.chain().focus().undo().run(), false, !editor?.can().undo())}
        {toolbarButton("Rehacer", <FaRedo />, () => editor?.chain().focus().redo().run(), false, !editor?.can().redo())}
      </ButtonGroup>
      <Box
        css={{
          '& .tiptap': { minH: "150px", p: 3, outline: "none" },
          '& .tiptap p': { mb: 2 },
          '& .tiptap ul, .tiptap ol': { pl: 6, mb: 2 },
          '& .tiptap a': { color: "blue.500", textDecoration: "underline" }
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
