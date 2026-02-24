#!/usr/bin/env npx tsx
/**
 * Transformer Quality Test - Extended Edition
 *
 * Comprehensive tests for React→Mirror transformation.
 * Tests all features: layout, events, states, tokens, components, etc.
 */

import { transformReactToMirror } from '../src/converter/react-pivot/pipeline/transformer'

interface TestCase {
  name: string
  input: string
  expected: string[]
  forbidden?: string[]
  category: string
}

const tests: TestCase[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'events',
    name: 'onClick show',
    input: `const App = () => (<Button onClick={{ action: 'show', target: 'Modal' }}>Open</Button>)`,
    expected: ['onclick: show Modal'],
  },
  {
    category: 'events',
    name: 'onClick hide',
    input: `const App = () => (<Button onClick={{ action: 'hide', target: 'Panel' }}>Close</Button>)`,
    expected: ['onclick: hide Panel'],
  },
  {
    category: 'events',
    name: 'onClick toggle',
    input: `const App = () => (<Button onClick={{ action: 'toggle', target: 'Menu' }}>Toggle</Button>)`,
    expected: ['onclick: toggle Menu'],
  },
  {
    category: 'events',
    name: 'onClick activate self',
    input: `const App = () => (<Item onClick={{ action: 'activate', target: 'self' }}>X</Item>)`,
    expected: ['onclick: activate self'],
  },
  {
    category: 'events',
    name: 'onClick deactivate-siblings',
    input: `const App = () => (<Item onClick={{ action: 'deactivate-siblings' }}>X</Item>)`,
    expected: ['onclick: deactivate-siblings'],
  },
  {
    category: 'events',
    name: 'onClick page navigation',
    input: `const App = () => (<Button onClick={{ action: 'page', target: 'Dashboard' }}>Go</Button>)`,
    expected: ['onclick: page Dashboard'],
  },
  {
    category: 'events',
    name: 'onClick assign',
    input: `const App = () => (<Item onClick={{ action: 'assign', variable: '$selected', expression: '$item' }}>X</Item>)`,
    expected: ['onclick: assign $selected to $item'],
  },
  {
    category: 'events',
    name: 'Multiple actions array',
    input: `const App = () => (<Item onClick={[{ action: 'activate', target: 'self' }, { action: 'deactivate-siblings' }, { action: 'assign', variable: '$current', expression: '$item' }]}>X</Item>)`,
    expected: ['onclick: activate self', 'onclick: deactivate-siblings', 'onclick: assign $current to $item'],
  },
  {
    category: 'events',
    name: 'onClick with animation',
    input: `const App = () => (<Button onClick={{ action: 'show', target: 'Panel', animation: 'fade' }}>Show</Button>)`,
    expected: ['onclick: show Panel fade'],
  },
  {
    category: 'events',
    name: 'onClick change state',
    input: `const App = () => (<Button onClick={{ action: 'change', target: 'self', toState: 'active' }}>X</Button>)`,
    expected: ['onclick: change self to active'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYOUT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'layout',
    name: 'Horizontal layout',
    input: `const App = () => (<Row style={{ direction: 'horizontal' }}><A /><B /></Row>)`,
    expected: ['Row hor'],
  },
  {
    category: 'layout',
    name: 'Gap spacing',
    input: `const App = () => (<Col style={{ gap: 16 }}><A /><B /></Col>)`,
    expected: ['gap 16'],
  },
  {
    category: 'layout',
    name: 'Token gap',
    input: `const App = () => (<Col style={{ gap: '$md.gap' }}><A /><B /></Col>)`,
    expected: ['gap $md.gap'],
  },
  {
    category: 'layout',
    name: 'Space-between',
    input: `const App = () => (<Row style={{ justifyContent: 'space-between' }}><A /><B /></Row>)`,
    expected: ['spread'],
  },
  {
    category: 'layout',
    name: 'Space-around',
    input: `const App = () => (<Row style={{ justifyContent: 'space-around' }}><A /><B /></Row>)`,
    expected: ['around'],
  },
  {
    category: 'layout',
    name: 'Flex-end',
    input: `const App = () => (<Row style={{ justifyContent: 'flex-end' }}><A /></Row>)`,
    expected: ['right'],
  },
  {
    category: 'layout',
    name: 'Flex-start',
    input: `const App = () => (<Row style={{ justifyContent: 'flex-start' }}><A /></Row>)`,
    expected: ['left'],
  },
  {
    category: 'layout',
    name: 'Align center',
    input: `const App = () => (<Row style={{ alignItems: 'center' }}><A /></Row>)`,
    expected: ['ver-center'],
  },
  {
    category: 'layout',
    name: 'Align flex-start',
    input: `const App = () => (<Row style={{ alignItems: 'flex-start' }}><A /></Row>)`,
    expected: ['top'],
  },
  {
    category: 'layout',
    name: 'Align flex-end',
    input: `const App = () => (<Row style={{ alignItems: 'flex-end' }}><A /></Row>)`,
    expected: ['bottom'],
  },
  {
    category: 'layout',
    name: 'Full center',
    input: `const App = () => (<Box style={{ alignItems: 'center', justifyContent: 'center' }}><A /></Box>)`,
    expected: ['center'],
  },
  {
    category: 'layout',
    name: 'Wrap',
    input: `const App = () => (<Row style={{ wrap: true }}><A /><B /></Row>)`,
    expected: ['wrap'],
  },
  {
    category: 'layout',
    name: 'Grid layout',
    input: `const App = () => (<Box style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}><A /><B /><C /></Box>)`,
    expected: ['grid 3'],
  },
  {
    category: 'layout',
    name: 'Stacked layout',
    input: `const App = () => (<Box style={{ layout: 'stacked' }}><A /><B /></Box>)`,
    expected: ['stacked'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SIZING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'sizing',
    name: 'Width fixed',
    input: `const App = () => (<Box style={{ width: 200 }}>X</Box>)`,
    expected: ['w 200'],
  },
  {
    category: 'sizing',
    name: 'Width full',
    input: `const App = () => (<Box style={{ width: 'full' }}>X</Box>)`,
    expected: ['w full'],
  },
  {
    category: 'sizing',
    name: 'Width hug',
    input: `const App = () => (<Box style={{ width: 'hug' }}>X</Box>)`,
    expected: ['w hug'],
  },
  {
    category: 'sizing',
    name: 'Height fixed',
    input: `const App = () => (<Box style={{ height: 100 }}>X</Box>)`,
    expected: ['h 100'],
  },
  {
    category: 'sizing',
    name: 'Height full',
    input: `const App = () => (<Box style={{ height: 'full' }}>X</Box>)`,
    expected: ['h full'],
  },
  {
    category: 'sizing',
    name: 'Min/max width',
    input: `const App = () => (<Box style={{ minWidth: 100, maxWidth: 500 }}>X</Box>)`,
    expected: ['min-w 100', 'max-w 500'],
  },
  {
    category: 'sizing',
    name: 'Min/max height',
    input: `const App = () => (<Box style={{ minHeight: 50, maxHeight: 300 }}>X</Box>)`,
    expected: ['min-h 50', 'max-h 300'],
  },
  {
    category: 'sizing',
    name: 'Grow',
    input: `const App = () => (<Box style={{ grow: true }}>X</Box>)`,
    expected: ['grow'],
  },
  {
    category: 'sizing',
    name: 'Flex 1 to grow',
    input: `const App = () => (<Box style={{ flex: 1 }}>X</Box>)`,
    expected: ['grow'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPACING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'spacing',
    name: 'Padding single',
    input: `const App = () => (<Box style={{ padding: 16 }}>X</Box>)`,
    expected: ['pad 16'],
  },
  {
    category: 'spacing',
    name: 'Padding array',
    input: `const App = () => (<Box style={{ padding: [8, 16] }}>X</Box>)`,
    expected: ['pad 8 16'],
  },
  {
    category: 'spacing',
    name: 'Padding token',
    input: `const App = () => (<Box style={{ padding: '$lg.pad' }}>X</Box>)`,
    expected: ['pad $lg.pad'],
  },
  {
    category: 'spacing',
    name: 'Margin',
    input: `const App = () => (<Box style={{ margin: 8 }}>X</Box>)`,
    expected: ['mar 8'],
  },
  {
    category: 'spacing',
    name: 'Directional padding',
    input: `const App = () => (<Box style={{ paddingTop: 8, paddingBottom: 16 }}>X</Box>)`,
    expected: ['pad top 8', 'pad bottom 16'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COLORS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'colors',
    name: 'Background token',
    input: `const App = () => (<Box style={{ background: '$primary.bg' }}>X</Box>)`,
    expected: ['bg $primary.bg'],
  },
  {
    category: 'colors',
    name: 'Color token',
    input: `const App = () => (<Text style={{ color: '$muted.col' }}>X</Text>)`,
    expected: ['col $muted.col'],
  },
  {
    category: 'colors',
    name: 'On-primary token preserved',
    input: `const App = () => (<Text style={{ color: '$on-primary.col' }}>X</Text>)`,
    expected: ['$on-primary.col'],
    forbidden: ['$on.primary.col'],
  },
  {
    category: 'colors',
    name: 'Primary-hover token',
    input: `const App = () => (<Box style={{ background: '$primary-hover.bg' }}>X</Box>)`,
    expected: ['$primary-hover.bg'],
  },
  {
    category: 'colors',
    name: 'Hex to surface.bg',
    input: `const App = () => (<Box style={{ background: '#27272a' }}>X</Box>)`,
    expected: ['$surface.bg'],
    forbidden: ['#27272a'],
  },
  {
    category: 'colors',
    name: 'Hex to muted.col',
    input: `const App = () => (<Text style={{ color: '#71717a' }}>X</Text>)`,
    expected: ['$muted.col'],
    forbidden: ['#71717a'],
  },
  {
    category: 'colors',
    name: 'Hex to primary.bg',
    input: `const App = () => (<Box style={{ background: '#3b82f6' }}>X</Box>)`,
    expected: ['$primary.bg'],
    forbidden: ['#3b82f6'],
  },
  {
    category: 'colors',
    name: 'Hex to danger.bg',
    input: `const App = () => (<Box style={{ background: '#ef4444' }}>X</Box>)`,
    expected: ['$danger.bg'],
    forbidden: ['#ef4444'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BORDER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'border',
    name: 'Border width',
    input: `const App = () => (<Box style={{ border: 1 }}>X</Box>)`,
    expected: ['bor 1'],
  },
  {
    category: 'border',
    name: 'Border radius',
    input: `const App = () => (<Box style={{ borderRadius: 8 }}>X</Box>)`,
    expected: ['rad 8'],
  },
  {
    category: 'border',
    name: 'Border radius token',
    input: `const App = () => (<Box style={{ borderRadius: '$md.rad' }}>X</Box>)`,
    expected: ['rad $md.rad'],
  },
  {
    category: 'border',
    name: 'Border color',
    input: `const App = () => (<Box style={{ borderColor: '$muted.col' }}>X</Box>)`,
    expected: ['boc $muted.col'],
  },
  {
    category: 'border',
    name: 'Border top',
    input: `const App = () => (<Box style={{ borderTop: 1 }}>X</Box>)`,
    expected: ['bor top 1'],
  },
  {
    category: 'border',
    name: 'Border bottom',
    input: `const App = () => (<Box style={{ borderBottom: 2 }}>X</Box>)`,
    expected: ['bor bottom 2'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPOGRAPHY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'typography',
    name: 'Font size',
    input: `const App = () => (<Text style={{ fontSize: 16 }}>X</Text>)`,
    expected: ['size 16'],
  },
  {
    category: 'typography',
    name: 'Font weight',
    input: `const App = () => (<Text style={{ fontWeight: 600 }}>X</Text>)`,
    expected: ['weight 600'],
  },
  {
    category: 'typography',
    name: 'Text align',
    input: `const App = () => (<Text style={{ textAlign: 'center' }}>X</Text>)`,
    expected: ['align center'],
  },
  {
    category: 'typography',
    name: 'Italic',
    input: `const App = () => (<Text style={{ italic: true }}>X</Text>)`,
    expected: ['italic'],
  },
  {
    category: 'typography',
    name: 'Underline',
    input: `const App = () => (<Text style={{ underline: true }}>X</Text>)`,
    expected: ['underline'],
  },
  {
    category: 'typography',
    name: 'Truncate',
    input: `const App = () => (<Text style={{ truncate: true }}>X</Text>)`,
    expected: ['truncate'],
  },
  {
    category: 'typography',
    name: 'Uppercase',
    input: `const App = () => (<Text style={{ uppercase: true }}>X</Text>)`,
    expected: ['uppercase'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUALS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'visuals',
    name: 'Opacity',
    input: `const App = () => (<Box style={{ opacity: 0.5 }}>X</Box>)`,
    expected: ['o 0.5'],
  },
  {
    category: 'visuals',
    name: 'Shadow',
    input: `const App = () => (<Box style={{ shadow: 'md' }}>X</Box>)`,
    expected: ['shadow md'],
  },
  {
    category: 'visuals',
    name: 'Cursor pointer',
    input: `const App = () => (<Box style={{ cursor: 'pointer' }}>X</Box>)`,
    expected: ['cursor pointer'],
  },
  {
    category: 'visuals',
    name: 'Z-index',
    input: `const App = () => (<Box style={{ zIndex: 10 }}>X</Box>)`,
    expected: ['z 10'],
  },
  {
    category: 'visuals',
    name: 'Hidden',
    input: `const App = () => (<Box style={{ hidden: true }}>X</Box>)`,
    expected: ['hidden'],
  },
  {
    category: 'visuals',
    name: 'Disabled',
    input: `const App = () => (<Button style={{ disabled: true }}>X</Button>)`,
    expected: ['disabled'],
  },
  {
    category: 'visuals',
    name: 'Rotation',
    input: `const App = () => (<Icon style={{ rotate: 45 }} name="arrow" />)`,
    expected: ['rot 45'],
  },
  {
    category: 'visuals',
    name: 'Scroll',
    input: `const App = () => (<Box style={{ overflow: 'scroll' }}>X</Box>)`,
    expected: ['scroll'],
  },
  {
    category: 'visuals',
    name: 'Clip',
    input: `const App = () => (<Box style={{ overflow: 'hidden' }}>X</Box>)`,
    expected: ['clip'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'position',
    name: 'Absolute',
    input: `const App = () => (<Box style={{ position: 'absolute' }}>X</Box>)`,
    expected: ['absolute'],
  },
  {
    category: 'position',
    name: 'Fixed',
    input: `const App = () => (<Box style={{ position: 'fixed' }}>X</Box>)`,
    expected: ['fixed'],
  },
  {
    category: 'position',
    name: 'Position values',
    input: `const App = () => (<Box style={{ position: 'absolute', top: 0, right: 0 }}>X</Box>)`,
    expected: ['absolute', 'top 0', 'right 0'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // STATES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'states',
    name: 'Hover state',
    input: `const Btn = mirror({ tag: 'button', base: { padding: 8 }, states: { hover: { background: '$hover.bg' } } })`,
    expected: ['hover', 'bg $hover.bg'],
  },
  {
    category: 'states',
    name: 'Focus state',
    input: `const Input = mirror({ tag: 'input', base: { padding: 8 }, states: { focus: { borderColor: '$primary.col' } } })`,
    expected: ['focus', 'boc $primary.col'],
  },
  {
    category: 'states',
    name: 'Selected state',
    input: `const Item = mirror({ tag: 'div', base: { padding: 8 }, states: { selected: { background: '$primary.bg' } } })`,
    expected: ['state selected', 'bg $primary.bg'],
  },
  {
    category: 'states',
    name: 'Disabled state',
    input: `const Btn = mirror({ tag: 'button', base: { padding: 8 }, states: { disabled: { opacity: 0.5 } } })`,
    expected: ['disabled', 'o 0.5'],
  },
  {
    category: 'states',
    name: 'Multiple states',
    input: `const Btn = mirror({ tag: 'button', base: { padding: 8 }, states: { hover: { background: '$hover.bg' }, active: { background: '$primary.bg' } } })`,
    expected: ['hover', 'active'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'components',
    name: 'Component definition',
    input: `const Card = mirror({ tag: 'div', base: { padding: 16, borderRadius: 8 } })`,
    expected: ['Card:', 'pad 16', 'rad 8'],
  },
  {
    category: 'components',
    name: 'Component inheritance',
    input: `const Card = mirror({ tag: 'div', base: { padding: 16 } })\nconst DangerCard = Card.extend({ base: { background: '$danger.bg' } })`,
    expected: ['Card:', 'DangerCard: Card', '$danger.bg'],
  },
  {
    category: 'components',
    name: 'Named instance',
    input: `const App = () => (<Modal name='MyModal'>X</Modal>)`,
    expected: ['Modal named MyModal'],
  },
  {
    category: 'components',
    name: 'List item',
    input: `const App = () => (<Nav><Item listItem>A</Item><Item listItem>B</Item></Nav>)`,
    expected: ['- Item'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ICONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'icons',
    name: 'Icon name',
    input: `const App = () => (<Icon name='home' />)`,
    expected: ['Icon "home"'],
    forbidden: ['named home'],
  },
  {
    category: 'icons',
    name: 'Icon with style',
    input: `const App = () => (<Icon name='settings' style={{ color: '$muted.col' }} />)`,
    expected: ['Icon col $muted.col, "settings"'],
  },
  {
    category: 'icons',
    name: 'Material icon',
    input: `const App = () => (<Icon name='check' material />)`,
    expected: ['Icon', 'material', '"check"'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'inputs',
    name: 'Input placeholder',
    input: `const App = () => (<Input placeholder='Enter name' />)`,
    expected: ['Input', 'placeholder "Enter name"'],
  },
  {
    category: 'inputs',
    name: 'Input type email',
    input: `const App = () => (<Input type='email' placeholder='Email' />)`,
    expected: ['type email'],
  },
  {
    category: 'inputs',
    name: 'Input type password',
    input: `const App = () => (<Input type='password' />)`,
    expected: ['type password'],
  },
  {
    category: 'inputs',
    name: 'Input with styles',
    input: `const App = () => (<Input placeholder='Name' style={{ padding: 12, background: '$input.bg', borderRadius: 6 }} />)`,
    expected: ['Input pad 12', 'bg $input.bg', 'rad 6'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOLEAN PROPS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'boolean-props',
    name: 'Hidden prop',
    input: `const App = () => (<Modal name='M' hidden>X</Modal>)`,
    expected: ['hidden'],
  },
  {
    category: 'boolean-props',
    name: 'Disabled prop',
    input: `const App = () => (<Button disabled>X</Button>)`,
    expected: ['disabled'],
  },
  {
    category: 'boolean-props',
    name: 'Hidden with style',
    input: `const App = () => (<Panel hidden style={{ padding: 16 }}>X</Panel>)`,
    expected: ['hidden', 'pad 16'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONDITIONALS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'conditionals',
    name: 'Simple conditional',
    input: `const App = () => ({condition('$isLoggedIn', <Avatar />, <Button>Login</Button>)})`,
    expected: ['if $isLoggedIn', 'Avatar', 'else', 'Button'],
  },
  {
    category: 'conditionals',
    name: 'Conditional without else',
    input: `const App = () => ({condition('$showPanel', <Panel>Content</Panel>)})`,
    expected: ['if $showPanel', 'Panel'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATORS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'iterators',
    name: 'Each loop',
    input: `const App = () => ({each('$item', '$items', (<Item listItem><Text>{'{$item.name}'}</Text></Item>))})`,
    expected: ['each $item in $items', '- Item'],
  },
  {
    category: 'iterators',
    name: 'Each with complex template',
    input: `const App = () => ({each('$user', '$users', (<Card><Avatar /><Text>{'{$user.name}'}</Text></Card>))})`,
    expected: ['each $user in $users', 'Card', 'Avatar'],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLEX SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    category: 'complex',
    name: 'Full modal',
    input: `const App = () => (
      <Modal name='Confirm' hidden style={{ padding: 24, background: '$elevated.bg', borderRadius: 12 }}>
        <Title style={{ color: '$heading.col' }}>Confirm</Title>
        <Row style={{ gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={{ action: 'hide', target: 'Confirm' }}>Cancel</Button>
          <Button style={{ background: '$danger.bg' }} onClick={{ action: 'hide', target: 'Confirm' }}>Delete</Button>
        </Row>
      </Modal>
    )`,
    expected: ['Modal named Confirm', 'hidden', 'pad 24', 'onclick: hide Confirm', '$danger.bg'],
  },
  {
    category: 'complex',
    name: 'Navigation with selection',
    input: `const App = () => (
      <Nav style={{ gap: 4 }}>
        <NavItem listItem onClick={[{ action: 'activate', target: 'self' }, { action: 'deactivate-siblings' }]}>
          <Icon name='home' />
          <Text>Home</Text>
        </NavItem>
        <NavItem listItem onClick={[{ action: 'activate', target: 'self' }, { action: 'deactivate-siblings' }]}>
          <Icon name='settings' />
          <Text>Settings</Text>
        </NavItem>
      </Nav>
    )`,
    expected: ['Nav gap 4', '- NavItem', 'onclick: activate self', 'onclick: deactivate-siblings', 'Icon "home"', 'Icon "settings"'],
  },
  {
    category: 'complex',
    name: 'Form with inputs',
    input: `const App = () => (
      <Form style={{ gap: 16, padding: 24 }}>
        <Input type='email' placeholder='Email' style={{ padding: 12, background: '$input.bg' }} />
        <Input type='password' placeholder='Password' style={{ padding: 12, background: '$input.bg' }} />
        <Button style={{ background: '$primary.bg', color: '$on-primary.col' }}>Login</Button>
      </Form>
    )`,
    expected: ['Form gap 16, pad 24', 'type email', 'type password', '$primary.bg', '$on-primary.col'],
  },
  {
    category: 'complex',
    name: 'Header with spread layout',
    input: `const App = () => (
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <Title style={{ color: '$heading.col' }}>Dashboard</Title>
        <Row style={{ gap: 8 }}>
          <Button>Settings</Button>
          <Avatar />
        </Row>
      </Row>
    )`,
    expected: ['Row ver-center, spread, pad 16', 'Title col $heading.col', 'Row gap 8'],
  },
  {
    category: 'complex',
    name: 'Card grid',
    input: `const App = () => (
      <Row style={{ gap: 16, wrap: true }}>
        <Card style={{ flex: 1, padding: 16, background: '$elevated.bg' }}><Text>Card 1</Text></Card>
        <Card style={{ flex: 1, padding: 16, background: '$elevated.bg' }}><Text>Card 2</Text></Card>
        <Card style={{ flex: 1, padding: 16, background: '$elevated.bg' }}><Text>Card 3</Text></Card>
      </Row>
    )`,
    expected: ['Row wrap, gap 16', 'Card grow, pad 16', '$elevated.bg'],
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════

console.log('═'.repeat(70))
console.log('  TRANSFORMER QUALITY TEST - EXTENDED')
console.log('═'.repeat(70))

const categories = [...new Set(tests.map(t => t.category))]
const results: Record<string, { passed: number; failed: number; tests: string[] }> = {}

for (const category of categories) {
  results[category] = { passed: 0, failed: 0, tests: [] }
}

let totalPassed = 0
let totalFailed = 0
const failures: { test: TestCase; output: string; issues: string[] }[] = []

for (const test of tests) {
  const result = transformReactToMirror(test.input)
  const output = result.mirrorCode

  let success = true
  const issues: string[] = []

  for (const pattern of test.expected) {
    if (!output.includes(pattern)) {
      success = false
      issues.push(`Missing: "${pattern}"`)
    }
  }

  if (test.forbidden) {
    for (const pattern of test.forbidden) {
      if (output.includes(pattern)) {
        success = false
        issues.push(`Found forbidden: "${pattern}"`)
      }
    }
  }

  if (success) {
    results[test.category].passed++
    totalPassed++
  } else {
    results[test.category].failed++
    results[test.category].tests.push(test.name)
    totalFailed++
    failures.push({ test, output, issues })
  }
}

// Print category summary
console.log()
console.log('Category Summary:')
console.log('─'.repeat(70))
console.log(`${'Category'.padEnd(20)} | ${'Passed'.padStart(8)} | ${'Failed'.padStart(8)} | ${'Rate'.padStart(8)}`)
console.log('─'.repeat(70))

for (const category of categories) {
  const r = results[category]
  const total = r.passed + r.failed
  const rate = total > 0 ? Math.round((r.passed / total) * 100) : 100
  const status = r.failed === 0 ? '✓' : '✗'
  console.log(`${status} ${category.padEnd(18)} | ${String(r.passed).padStart(8)} | ${String(r.failed).padStart(8)} | ${(rate + '%').padStart(8)}`)
}

console.log('─'.repeat(70))
console.log(`${'TOTAL'.padEnd(20)} | ${String(totalPassed).padStart(8)} | ${String(totalFailed).padStart(8)} | ${(Math.round((totalPassed / tests.length) * 100) + '%').padStart(8)}`)
console.log('─'.repeat(70))

// Print failures if any
if (failures.length > 0) {
  console.log()
  console.log('Failed Tests:')
  console.log('─'.repeat(70))
  for (const { test, output, issues } of failures.slice(0, 10)) {
    console.log(`\n✗ [${test.category}] ${test.name}`)
    issues.forEach(i => console.log(`  ${i}`))
    console.log(`  Output: ${output.split('\n').slice(0, 3).join(' | ')}...`)
  }
  if (failures.length > 10) {
    console.log(`\n... and ${failures.length - 10} more failures`)
  }
}

console.log()
console.log('═'.repeat(70))
if (totalFailed === 0) {
  console.log(`  ✓ ALL ${tests.length} TESTS PASSED`)
} else {
  console.log(`  ✗ ${totalFailed}/${tests.length} TESTS FAILED`)
}
console.log('═'.repeat(70))

process.exit(totalFailed > 0 ? 1 : 0)
