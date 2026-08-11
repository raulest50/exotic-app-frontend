import { fileURLToPath } from "node:url";
import { join } from "node:path";
import ts from "typescript";

type Finding = {
  column: number;
  file: string;
  line: number;
  message: string;
  rule: string;
};

const allowedFlags = new Set(["--all", "--allow-v2", "--baseline", "--strict"]);
const flags = new Set(Bun.argv.slice(2));
const unknownFlags = [...flags].filter((flag) => !allowedFlags.has(flag));

if (unknownFlags.length > 0) {
  console.error(`Unknown option(s): ${unknownFlags.join(", ")}`);
  console.error("Usage: bun scripts/check-chakra-v3.ts [--allow-v2|--baseline|--strict] [--all]");
  process.exit(2);
}

// Strict mode is the default and is also selected explicitly by package.json.
// --allow-v2 and --baseline remain available only for historical comparison.
const strict = flags.has("--strict") || (!flags.has("--allow-v2") && !flags.has("--baseline"));
const showAll = flags.has("--all");
const projectRoot = fileURLToPath(new URL("..", import.meta.url));

const legacyModules = new Set([
  "@chakra-ui/hooks",
  "@chakra-ui/icons",
  "@chakra-ui/next-js",
]);

const legacyNamedImports = new Set([
  "AccordionButton",
  "AccordionIcon",
  "AccordionItem",
  "AccordionPanel",
  "AlertDescription",
  "AlertDialogBody",
  "AlertDialogCloseButton",
  "AlertDialogContent",
  "AlertDialogFooter",
  "AlertDialogHeader",
  "AlertDialogOverlay",
  "AlertIcon",
  "AlertTitle",
  "AvatarBadge",
  "AvatarGroup",
  "BreadcrumbItem",
  "BreadcrumbLink",
  "BreadcrumbSeparator",
  "CardBody",
  "CardFooter",
  "CardHeader",
  "ColorModeScript",
  "DarkMode",
  "DrawerBody",
  "DrawerCloseButton",
  "DrawerContent",
  "DrawerFooter",
  "DrawerHeader",
  "DrawerOverlay",
  "FormControl",
  "FormErrorMessage",
  "FormHelperText",
  "FormLabel",
  "InputLeftAddon",
  "InputLeftElement",
  "InputRightAddon",
  "InputRightElement",
  "LightMode",
  "MenuButton",
  "MenuDivider",
  "MenuGroup",
  "MenuItem",
  "MenuItemOption",
  "MenuList",
  "MenuOptionGroup",
  "Modal",
  "ModalBody",
  "ModalCloseButton",
  "ModalContent",
  "ModalFooter",
  "ModalHeader",
  "ModalOverlay",
  "NumberDecrementStepper",
  "NumberIncrementStepper",
  "NumberInputField",
  "NumberInputStepper",
  "PinInputField",
  "PopoverArrow",
  "PopoverBody",
  "PopoverCloseButton",
  "PopoverContent",
  "PopoverFooter",
  "PopoverHeader",
  "PopoverTrigger",
  "ProgressLabel",
  "RangeSlider",
  "RangeSliderFilledTrack",
  "RangeSliderMark",
  "RangeSliderThumb",
  "RangeSliderTrack",
  "SliderFilledTrack",
  "SliderMark",
  "SliderThumb",
  "SliderTrack",
  "StatArrow",
  "StatGroup",
  "StatHelpText",
  "StatLabel",
  "StatNumber",
  "Step",
  "StepDescription",
  "StepIcon",
  "StepIndicator",
  "StepNumber",
  "StepSeparator",
  "StepStatus",
  "StepTitle",
  "Stepper",
  "Tab",
  "TableCaption",
  "TableContainer",
  "TabList",
  "TabPanel",
  "TabPanels",
  "TagCloseButton",
  "TagLabel",
  "TagLeftIcon",
  "TagRightIcon",
  "Tbody",
  "Td",
  "Tfoot",
  "Th",
  "Thead",
  "Tr",
  "extendTheme",
  "useColorMode",
  "useColorModeValue",
  "useOutsideClick",
  "useToast",
]);

const legacyDirectCompoundComponents = new Set([
  "Accordion",
  "Alert",
  "AlertDialog",
  "Avatar",
  "Breadcrumb",
  "Card",
  "Checkbox",
  "Drawer",
  "Menu",
  "NumberInput",
  "PinInput",
  "Popover",
  "Progress",
  "Radio",
  "RadioGroup",
  "Select",
  "Slider",
  "Stat",
  "Stepper",
  "Switch",
  "Table",
  "Tabs",
  "Tag",
  "Tooltip",
]);

const legacyProps = new Set([
  "colorScheme",
  "defaultIsOpen",
  "isChecked",
  "isDisabled",
  "isIndeterminate",
  "isInvalid",
  "isLoaded",
  "isLoading",
  "isOpen",
  "isReadOnly",
  "isRequired",
  "noOfLines",
  "precision",
  "spacingX",
  "spacingY",
  "sx",
  "truncated",
]);

const stackComponents = new Set(["HStack", "Stack", "VStack"]);
const findings: Finding[] = [];

function addFinding(sourceFile: ts.SourceFile, node: ts.Node, rule: string, message: string) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  findings.push({
    column: position.character + 1,
    file: sourceFile.fileName.replaceAll("\\", "/"),
    line: position.line + 1,
    message,
    rule,
  });
}

function getJsxBinding(
  tagName: ts.JsxTagNameExpression,
  chakraBindings: Map<string, string>,
): string | undefined {
  if (ts.isIdentifier(tagName)) {
    return chakraBindings.get(tagName.text);
  }

  let expression: ts.Expression = tagName;
  while (ts.isPropertyAccessExpression(expression)) {
    expression = expression.expression;
  }

  return ts.isIdentifier(expression) ? chakraBindings.get(expression.text) : undefined;
}

async function inspectFile(relativePath: string) {
  const absolutePath = join(projectRoot, relativePath);
  const sourceText = await Bun.file(absolutePath).text();
  const sourceFile = ts.createSourceFile(
    relativePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const chakraBindings = new Map<string, string>();

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const moduleName = statement.moduleSpecifier.text;
    if (legacyModules.has(moduleName)) {
      addFinding(sourceFile, statement.moduleSpecifier, "legacy-module", `Replace imports from ${moduleName}`);
    }

    if (moduleName !== "@chakra-ui/react" || !statement.importClause?.namedBindings) {
      continue;
    }

    const bindings = statement.importClause.namedBindings;
    if (ts.isNamespaceImport(bindings)) {
      addFinding(sourceFile, bindings, "namespace-import", "Review the Chakra namespace import manually");
      continue;
    }

    for (const element of bindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      chakraBindings.set(element.name.text, importedName);
      if (legacyNamedImports.has(importedName)) {
        addFinding(
          sourceFile,
          element,
          "legacy-import",
          `${importedName} is a Chakra UI v2 API`,
        );
      }
    }
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const chakraComponent = getJsxBinding(node.tagName, chakraBindings);
      if (chakraComponent) {
        if (ts.isIdentifier(node.tagName) && legacyDirectCompoundComponents.has(chakraComponent)) {
          addFinding(
            sourceFile,
            node.tagName,
            "legacy-component-shape",
            `${chakraComponent} must use the Chakra UI v3 compound API`,
          );
        }

        for (const property of node.attributes.properties) {
          if (!ts.isJsxAttribute(property)) {
            continue;
          }
          const propName = property.name.getText(sourceFile);
          const isNativeCssColorScheme = propName === "colorScheme" && chakraComponent === "Span";
          if (legacyProps.has(propName) && !isNativeCssColorScheme) {
            addFinding(
              sourceFile,
              property.name,
              "legacy-prop",
              `${chakraComponent}.${propName} uses a Chakra UI v2 prop`,
            );
          }
          if (propName === "spacing" && stackComponents.has(chakraComponent)) {
            addFinding(
              sourceFile,
              property.name,
              "stack-spacing",
              `${chakraComponent}.spacing must become gap in Chakra UI v3`,
            );
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

const sourceFiles: string[] = [];
for (const pattern of ["src/**/*.ts", "src/**/*.tsx"]) {
  const glob = new Bun.Glob(pattern);
  for await (const path of glob.scan({ cwd: projectRoot, onlyFiles: true })) {
    sourceFiles.push(path);
  }
}

for (const sourceFile of [...new Set(sourceFiles)].sort()) {
  await inspectFile(sourceFile);
}

findings.sort((left, right) =>
  left.file.localeCompare(right.file) || left.line - right.line || left.column - right.column,
);

if (findings.length === 0) {
  console.log("Chakra UI v3 check passed: no known v2 APIs were found in src/.");
  process.exit(0);
}

const countsByRule = new Map<string, number>();
for (const finding of findings) {
  countsByRule.set(finding.rule, (countsByRule.get(finding.rule) ?? 0) + 1);
}

const detailLimit = showAll ? findings.length : 100;
for (const finding of findings.slice(0, detailLimit)) {
  console.log(`${finding.file}:${finding.line}:${finding.column} [${finding.rule}] ${finding.message}`);
}
if (findings.length > detailLimit) {
  console.log(`... ${findings.length - detailLimit} additional finding(s); rerun with --all for full detail.`);
}

console.log("\nChakra UI v2 findings by rule:");
for (const [rule, count] of [...countsByRule.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  console.log(`- ${rule}: ${count}`);
}
console.log(`Total: ${findings.length}`);

if (strict) {
  console.error("Strict mode failed. Use --allow-v2 only while the controlled migration is in progress.");
  process.exit(1);
}

console.log("Baseline mode: v2 findings were reported without failing the command.");
console.log("Run `bun run check:chakra-v3 --strict` to exercise the final migration gate.");
