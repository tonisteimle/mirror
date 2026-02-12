# Vollständige Integration: Alle HTML-Blöcke

Dieses Dokument enthält alle fertigen HTML-Blöcke zum direkten Einfügen in mirror-doku.html.

---

## TEIL 1: Neue Kapitel

---

### 1.1 NEUES KAPITEL: Syntax Shortcuts

**Einfügen nach:** Section `#components` (nach Zeile mit `</section>` von Components)
**Einfügen vor:** Section `#tokens`

```html
    <div class="divider"></div>

    <!-- SYNTAX SHORTCUTS -->
    <section class="concept" id="syntax-shortcuts">
      <h2>Syntax Shortcuts</h2>
      <p class="lead">
        Mirror offers shortcuts to write less while expressing more. These patterns make code compact without sacrificing clarity.
      </p>

      <h3 id="dimension-shorthand">Dimension Shorthand</h3>
      <p>
        The first one or two numbers after a component name are interpreted as width and height:
      </p>

      <div class="grid">
        <div>
          <div class="label">Shorthand</div>
          <pre><span class="component">Box</span> <span class="value">300</span> <span class="value">400</span> <span class="property">pad</span> <span class="value">16</span>
<span class="component">Card</span> <span class="value">200</span> <span class="property">pad</span> <span class="value">8</span>
<span class="component">Panel</span> <span class="value">300</span> <span class="property">h</span> <span class="value">400</span></pre>
        </div>
        <div>
          <div class="label">Equivalent</div>
          <pre><span class="component">Box</span> <span class="property">w</span> <span class="value">300</span> <span class="property">h</span> <span class="value">400</span> <span class="property">pad</span> <span class="value">16</span>
<span class="component">Card</span> <span class="property">w</span> <span class="value">200</span> <span class="property">pad</span> <span class="value">8</span>
<span class="component">Panel</span> <span class="property">w</span> <span class="value">300</span> <span class="property">h</span> <span class="value">400</span></pre>
        </div>
      </div>

      <p>
        One number sets width only. Two numbers set width and height. You can mix shorthand with explicit properties.
      </p>

      <p class="why">
        <strong>Why this shorthand?</strong> Width and height are the most common sizing properties. Making them implicit reduces visual noise while keeping code readable. The pattern mirrors how designers think: "a 300 by 400 box".
      </p>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Simplify this code using dimension shorthand – remove <code class="inline-code">w</code> and <code class="inline-code">h</code> keywords.</p>
        <div class="mirror-editor" data-code="Card w 280 h 180 col #1a1a23 rad 12 pad 16
  Title weight 600 &quot;Project Alpha&quot;
  Text col #888 &quot;A description here&quot;" data-preview-height="140"></div>
      </div>

      <h3 id="image-shorthand">Image Shorthand</h3>
      <p>
        For <code class="inline-code">Image</code>, the string is the source URL, followed by optional dimensions:
      </p>

      <pre><span class="component">Image</span> <span class="string">"photo.jpg"</span> <span class="value">800</span> <span class="value">600</span>
<span class="component">Avatar</span> <span class="keyword">as</span> <span class="component">Image</span>: <span class="string">"user.png"</span> <span class="value">48</span> <span class="value">48</span> <span class="property">rad</span> <span class="value">24</span>
<span class="component">Thumbnail</span> <span class="keyword">as</span> <span class="component">Image</span>: <span class="value">120</span> <span class="value">80</span> <span class="property">fit</span> <span class="value">cover</span> <span class="property">rad</span> <span class="value">8</span></pre>

      <div class="preview" style="gap: 16px; align-items: center;">
        <div style="width: 120px; height: 80px; background: linear-gradient(135deg, #2271c1, #5ba8f5); border-radius: 8px;"></div>
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #333, #555); border-radius: 24px;"></div>
      </div>

      <h3 id="color-alpha">Colors with Alpha</h3>
      <p>
        Add transparency directly to hex colors using 8-digit notation (RRGGBBAA):
      </p>

      <pre><span class="component">Overlay</span> <span class="property">col</span> <span class="value">#00000080</span>      <span class="comment">// 50% transparent black</span>
<span class="component">Backdrop</span> <span class="property">col</span> <span class="value">#000000CC</span>     <span class="comment">// 80% transparent black</span>
<span class="component">Highlight</span> <span class="property">col</span> <span class="value">#3B82F640</span>    <span class="comment">// 25% transparent blue</span>
<span class="component">Glass</span> <span class="property">col</span> <span class="value">#FFFFFF15</span>        <span class="comment">// 8% transparent white</span></pre>

      <div class="preview" style="position: relative; height: 100px;">
        <div style="position: absolute; inset: 0; background: linear-gradient(135deg, #2271c1, #10B981); border-radius: 8px;"></div>
        <div style="position: absolute; inset: 0; background: #00000080; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">50% Overlay</div>
      </div>

      <div class="rule-box">
        <h4>Alpha Values</h4>
        <ul>
          <li><code class="inline-code">00</code> – Fully transparent (0%)</li>
          <li><code class="inline-code">40</code> – 25% opacity</li>
          <li><code class="inline-code">80</code> – 50% opacity</li>
          <li><code class="inline-code">BF</code> – 75% opacity</li>
          <li><code class="inline-code">FF</code> – Fully opaque (100%)</li>
        </ul>
      </div>

      <h3 id="token-suffix">Token Suffix Inference</h3>
      <p>
        Tokens with specific suffixes automatically apply to the right property:
      </p>

      <pre><span class="token">$card-col</span>: <span class="value">#1a1a23</span>      <span class="comment">// -col → color property</span>
<span class="token">$card-rad</span>: <span class="value">12</span>            <span class="comment">// -rad → border-radius</span>
<span class="token">$card-pad</span>: <span class="value">16</span>            <span class="comment">// -pad → padding</span>

<span class="comment">// These are equivalent:</span>
<span class="component">Card</span> <span class="token">$card-col</span> <span class="token">$card-rad</span> <span class="token">$card-pad</span>
<span class="component">Card</span> <span class="property">col</span> <span class="token">$card-col</span> <span class="property">rad</span> <span class="token">$card-rad</span> <span class="property">pad</span> <span class="token">$card-pad</span></pre>

      <div class="rule-box">
        <h4>Recognized Suffixes</h4>
        <ul>
          <li><code class="inline-code">-col</code> → <code class="inline-code">col</code> (color)</li>
          <li><code class="inline-code">-bg</code> → <code class="inline-code">bg</code> (background)</li>
          <li><code class="inline-code">-rad</code> → <code class="inline-code">rad</code> (border-radius)</li>
          <li><code class="inline-code">-pad</code> → <code class="inline-code">pad</code> (padding)</li>
          <li><code class="inline-code">-gap</code> → <code class="inline-code">gap</code> (gap)</li>
          <li><code class="inline-code">-bor</code> → <code class="inline-code">bor</code> (border-width)</li>
          <li><code class="inline-code">-boc</code> → <code class="inline-code">boc</code> (border-color)</li>
        </ul>
      </div>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create tokens with suffixes and use them without explicit property names.</p>
        <div class="mirror-editor" data-code="$primary-col: #2271c1
$button-rad: 8
$button-pad: 12

Button col $primary-col rad $button-rad pad $button-pad &quot;Click me&quot;" data-preview-height="80"></div>
      </div>

    </section>
```

---

### 1.2 NEUES KAPITEL: Modifiers

**Einfügen nach:** Section `#forms` (nach Zeile mit `</section>` von Forms)
**Einfügen vor:** Section `#interaktivitaet`

```html
    <div class="divider"></div>

    <!-- MODIFIERS -->
    <section class="concept" id="modifiers">
      <h2>Modifiers</h2>
      <p class="lead">
        Apply common styles with a single keyword. Modifiers are shortcuts for frequently used property combinations.
      </p>

      <p>
        Instead of repeatedly writing the same property combinations, use modifiers. A modifier starts with a dash and applies a predefined set of styles.
      </p>

      <h3 id="style-modifiers">Style Modifiers</h3>
      <p>
        Button styles are the most common use case:
      </p>

      <pre><span class="component">Button</span> <span class="keyword">-primary</span> <span class="string">"Submit"</span>
<span class="component">Button</span> <span class="keyword">-secondary</span> <span class="string">"Cancel"</span>
<span class="component">Button</span> <span class="keyword">-outlined</span> <span class="string">"Details"</span>
<span class="component">Button</span> <span class="keyword">-ghost</span> <span class="string">"Skip"</span>
<span class="component">Button</span> <span class="keyword">-disabled</span> <span class="string">"Unavailable"</span></pre>

      <div class="preview" style="gap: 8px; flex-wrap: wrap;">
        <div style="background: #2271c1; color: white; padding: 10px 20px; border-radius: 6px; font-size: 14px;">Submit</div>
        <div style="background: #333; color: white; padding: 10px 20px; border-radius: 6px; font-size: 14px;">Cancel</div>
        <div style="background: transparent; border: 1px solid #555; color: #aaa; padding: 10px 20px; border-radius: 6px; font-size: 14px;">Details</div>
        <div style="background: transparent; color: #888; padding: 10px 20px; border-radius: 6px; font-size: 14px;">Skip</div>
        <div style="background: #333; color: white; padding: 10px 20px; border-radius: 6px; font-size: 14px; opacity: 0.5;">Unavailable</div>
      </div>

      <div class="rule-box">
        <h4>Available Style Modifiers</h4>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 6px 0; width: 120px;"><code class="inline-code">-primary</code></td>
            <td>Blue background, white text – main action</td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 6px 0;"><code class="inline-code">-secondary</code></td>
            <td>Gray background – secondary action</td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 6px 0;"><code class="inline-code">-outlined</code></td>
            <td>Transparent with border – subtle action</td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 6px 0;"><code class="inline-code">-ghost</code></td>
            <td>Fully transparent – minimal presence</td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 6px 0;"><code class="inline-code">-filled</code></td>
            <td>Solid background (explicit)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><code class="inline-code">-disabled</code></td>
            <td>50% opacity, pointer-events disabled</td>
          </tr>
        </table>
      </div>

      <h3 id="shape-modifiers">Shape Modifiers</h3>
      <p>
        Change the shape of elements:
      </p>

      <pre><span class="component">Button</span> <span class="keyword">-primary</span> <span class="keyword">-rounded</span> <span class="string">"Pill Button"</span>
<span class="component">Avatar</span> <span class="keyword">-rounded</span> <span class="property">w</span> <span class="value">48</span> <span class="property">h</span> <span class="value">48</span> <span class="property">col</span> <span class="value">#2271c1</span> <span class="property">cen</span> <span class="string">"AB"</span>
<span class="component">Tag</span> <span class="keyword">-rounded</span> <span class="property">col</span> <span class="value">#10B981</span> <span class="property">pad</span> <span class="value">4 12</span> <span class="property">size</span> <span class="value">12</span> <span class="string">"New"</span></pre>

      <div class="preview" style="gap: 16px; align-items: center;">
        <div style="background: #2271c1; color: white; padding: 10px 24px; border-radius: 999px; font-size: 14px;">Pill Button</div>
        <div style="width: 48px; height: 48px; background: #2271c1; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">AB</div>
        <div style="background: #10B981; color: white; padding: 4px 12px; border-radius: 999px; font-size: 12px;">New</div>
      </div>

      <div class="rule-box">
        <h4>Shape Modifiers</h4>
        <ul>
          <li><code class="inline-code">-rounded</code> – Fully rounded corners (pill shape for buttons, circle for squares)</li>
        </ul>
      </div>

      <h3 id="combining-modifiers">Combining Modifiers</h3>
      <p>
        Modifiers can be combined and mixed with regular properties:
      </p>

      <pre><span class="component">Button</span> <span class="keyword">-primary</span> <span class="keyword">-rounded</span> <span class="property">pad</span> <span class="value">12 32</span> <span class="string">"Large Pill"</span>
<span class="component">Button</span> <span class="keyword">-outlined</span> <span class="property">boc</span> <span class="value">#EF4444</span> <span class="property">col</span> <span class="value">#EF4444</span> <span class="string">"Danger"</span>
<span class="component">Button</span> <span class="keyword">-ghost</span> <span class="property">col</span> <span class="value">#3B82F6</span> <span class="string">"Link Style"</span></pre>

      <div class="preview" style="gap: 12px; align-items: center;">
        <div style="background: #2271c1; color: white; padding: 12px 32px; border-radius: 999px; font-size: 14px;">Large Pill</div>
        <div style="background: transparent; border: 1px solid #EF4444; color: #EF4444; padding: 10px 20px; border-radius: 6px; font-size: 14px;">Danger</div>
        <div style="background: transparent; color: #3B82F6; padding: 10px 20px; font-size: 14px;">Link Style</div>
      </div>

      <p class="why">
        <strong>Why modifiers?</strong> They encode design decisions. <code>-primary</code> means "this is the main action" regardless of what color primary happens to be. When you change your primary color, all <code>-primary</code> elements update. Modifiers express intent, not just appearance.
      </p>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create a button group with primary, outlined, and ghost buttons. Add <code class="inline-code">-rounded</code> to the primary button.</p>
        <div class="mirror-editor" data-code="Row hor gap 8
  Button col #2271c1 pad 10 20 rad 6 &quot;Submit&quot;
  Button col #333 pad 10 20 rad 6 &quot;Cancel&quot;
  Button pad 10 20 &quot;Skip&quot;" data-preview-height="80"></div>
      </div>

    </section>
```

---

### 1.3 NEUES KAPITEL: Library Components

**Einfügen nach:** Section `#slots` (nach Zeile mit `</section>` von Slots)
**Einfügen vor:** Section `#tutorial-dashboard`

```html
    <div class="divider"></div>

    <!-- ============================================ -->
    <!-- LIBRARY COMPONENTS -->
    <!-- ============================================ -->

    <section class="concept" id="library">
      <h2>Library Components</h2>
      <p class="lead">
        Pre-built interactive components with built-in behavior. Use them as-is or customize their slots and states.
      </p>

      <p>
        Library components handle complex interactions automatically: keyboard navigation, focus management, ARIA attributes, animations. You focus on content and styling – Mirror handles the behavior.
      </p>

      <p>
        Each library component has:
      </p>
      <ul>
        <li><strong>Slots</strong> – Named positions for your content</li>
        <li><strong>States</strong> – Visual states that change automatically</li>
        <li><strong>Behavior</strong> – Built-in interactions (clicks, keyboard, focus)</li>
      </ul>

      <!-- ===================== TABS ===================== -->
      <h3 id="lib-tabs">Tabs</h3>
      <p>
        Organize content into switchable panels. Only one panel is visible at a time. Keyboard navigation (arrow keys) is built-in.
      </p>

      <pre><span class="component">Tabs</span>
  <span class="component">TabList</span> <span class="property">hor</span> <span class="property">gap</span> <span class="value">4</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">pad</span> <span class="value">4</span> <span class="property">rad</span> <span class="value">8</span>
    <span class="component">Tab</span> <span class="string">"Overview"</span>
    <span class="component">Tab</span> <span class="string">"Details"</span>
    <span class="component">Tab</span> <span class="string">"Settings"</span>
  <span class="component">TabContent</span>
    <span class="component">Panel</span> <span class="property">pad</span> <span class="value">16</span>
      <span class="string">"Overview content goes here."</span>
    <span class="component">Panel</span> <span class="property">pad</span> <span class="value">16</span>
      <span class="string">"Details content goes here."</span>
    <span class="component">Panel</span> <span class="property">pad</span> <span class="value">16</span>
      <span class="string">"Settings content goes here."</span></pre>

      <div class="preview preview-col" style="gap: 0;">
        <div style="display: flex; gap: 4px; background: #1A1A23; padding: 4px; border-radius: 8px 8px 0 0;">
          <div style="padding: 8px 16px; background: #2271c1; border-radius: 6px; color: white; font-size: 13px;">Overview</div>
          <div style="padding: 8px 16px; color: #666; font-size: 13px; cursor: pointer;">Details</div>
          <div style="padding: 8px 16px; color: #666; font-size: 13px; cursor: pointer;">Settings</div>
        </div>
        <div style="padding: 16px; background: #0f0f0f; border: 1px solid #222; border-top: none; border-radius: 0 0 8px 8px; color: #888; font-size: 13px;">
          Overview content goes here.
        </div>
      </div>

      <div class="rule-box">
        <h4>Tabs Slots</h4>
        <ul>
          <li><code class="inline-code">TabList</code> – Container for tab buttons</li>
          <li><code class="inline-code">Tab</code> – Individual tab button (use <code>-</code> to create multiple)</li>
          <li><code class="inline-code">TabContent</code> – Container for all panels</li>
          <li><code class="inline-code">Panel</code> – Content for each tab (matched by order)</li>
        </ul>
        <h4 style="margin-top: 12px;">Tab States</h4>
        <ul>
          <li><code class="inline-code">inactive</code> – Tab is not selected (default)</li>
          <li><code class="inline-code">active</code> – Tab is currently selected</li>
        </ul>
      </div>

      <h4>Styling Tab States</h4>
      <p>
        Customize the active/inactive appearance:
      </p>

      <pre><span class="component">Tabs</span>
  <span class="component">TabList</span> <span class="property">hor</span> <span class="property">gap</span> <span class="value">0</span> <span class="property">bor-b</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#333</span>
    <span class="component">Tab:</span> <span class="property">pad</span> <span class="value">12 16</span>
      <span class="keyword">state</span> <span class="value">inactive</span>
        <span class="property">col</span> <span class="value">transparent</span>
        <span class="property">bor-b</span> <span class="value">2</span> <span class="property">boc</span> <span class="value">transparent</span>
      <span class="keyword">state</span> <span class="value">active</span>
        <span class="property">col</span> <span class="value">transparent</span>
        <span class="property">bor-b</span> <span class="value">2</span> <span class="property">boc</span> <span class="value">#2271c1</span>
    <span class="keyword">-</span> <span class="component">Tab</span> <span class="string">"Files"</span>
    <span class="keyword">-</span> <span class="component">Tab</span> <span class="string">"Edits"</span>
    <span class="keyword">-</span> <span class="component">Tab</span> <span class="string">"History"</span>
  <span class="component">TabContent</span> <span class="property">pad</span> <span class="value">16</span>
    <span class="component">Panel</span> <span class="string">"Your files appear here."</span>
    <span class="component">Panel</span> <span class="string">"Recent edits."</span>
    <span class="component">Panel</span> <span class="string">"Version history."</span></pre>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create tabs for "Code", "Preview", and "Output". Style the active tab with a colored bottom border.</p>
        <div class="mirror-editor" data-code="Tabs
  TabList hor col #1A1A23 pad 4 rad 8
    Tab &quot;Code&quot;
    Tab &quot;Preview&quot;
    Tab &quot;Output&quot;
  TabContent pad 16
    Panel &quot;Write your code here&quot;
    Panel &quot;See the preview&quot;
    Panel &quot;View the output&quot;" data-preview-height="160"></div>
      </div>

      <!-- ===================== ACCORDION ===================== -->
      <h3 id="lib-accordion">Accordion</h3>
      <p>
        Collapsible sections where only one (or multiple) can be open at a time. Great for FAQs, settings panels, or navigation menus.
      </p>

      <pre><span class="component">Accordion</span>
  <span class="component">AccordionItem</span>
    <span class="component">Trigger</span> <span class="property">pad</span> <span class="value">16</span> <span class="property">hor</span> <span class="property">between</span> <span class="property">ver-cen</span>
      <span class="component">Text</span> <span class="property">weight</span> <span class="value">500</span> <span class="string">"What is Mirror?"</span>
      <span class="component">Icon</span> <span class="property">icon</span> <span class="string">"chevron-down"</span> <span class="property">size</span> <span class="value">16</span>
    <span class="component">Content</span> <span class="property">pad</span> <span class="value">0 16 16 16</span>
      <span class="component">Text</span> <span class="property">col</span> <span class="value">#888</span> <span class="string">"Mirror is a description language for user interfaces."</span>
  <span class="component">AccordionItem</span>
    <span class="component">Trigger</span> <span class="property">pad</span> <span class="value">16</span> <span class="property">hor</span> <span class="property">between</span> <span class="property">ver-cen</span>
      <span class="component">Text</span> <span class="property">weight</span> <span class="value">500</span> <span class="string">"How do I get started?"</span>
      <span class="component">Icon</span> <span class="property">icon</span> <span class="string">"chevron-down"</span> <span class="property">size</span> <span class="value">16</span>
    <span class="component">Content</span> <span class="property">pad</span> <span class="value">0 16 16 16</span>
      <span class="component">Text</span> <span class="property">col</span> <span class="value">#888</span> <span class="string">"Start by creating components and adding properties."</span></pre>

      <div class="preview preview-col" style="gap: 1px; background: #222; border-radius: 8px; overflow: hidden;">
        <div style="background: #1A1A23;">
          <div style="padding: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-weight: 500; color: white;">What is Mirror?</span>
            <span style="color: #666;">▼</span>
          </div>
          <div style="padding: 0 16px 16px 16px; color: #888; font-size: 13px;">
            Mirror is a description language for user interfaces.
          </div>
        </div>
        <div style="background: #1A1A23;">
          <div style="padding: 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <span style="font-weight: 500; color: white;">How do I get started?</span>
            <span style="color: #666;">▶</span>
          </div>
        </div>
      </div>

      <div class="rule-box">
        <h4>Accordion Slots</h4>
        <ul>
          <li><code class="inline-code">AccordionItem</code> – A single collapsible section</li>
          <li><code class="inline-code">Trigger</code> – The clickable header</li>
          <li><code class="inline-code">Content</code> – The collapsible content</li>
        </ul>
        <h4 style="margin-top: 12px;">AccordionItem States</h4>
        <ul>
          <li><code class="inline-code">collapsed</code> – Content is hidden (default)</li>
          <li><code class="inline-code">expanded</code> – Content is visible</li>
        </ul>
      </div>

      <h4>Multiple Open</h4>
      <p>
        By default, opening one item closes others. Add <code class="inline-code">multiple</code> to allow several open at once:
      </p>

      <pre><span class="component">Accordion</span> <span class="property">multiple</span>
  <span class="comment">// Items can now be independently open/closed</span></pre>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create an accordion with three FAQ items. Add a chevron icon that rotates when expanded.</p>
        <div class="mirror-editor" data-code="Accordion col #1A1A23 rad 8
  AccordionItem
    Trigger pad 16 hor between ver-cen
      Text weight 500 &quot;Question 1?&quot;
    Content pad 16
      Text col #888 &quot;Answer 1&quot;" data-preview-height="200"></div>
      </div>

      <!-- ===================== COLLAPSIBLE ===================== -->
      <h3 id="lib-collapsible">Collapsible</h3>
      <p>
        A single expandable/collapsible section. Simpler than Accordion when you only need one.
      </p>

      <pre><span class="component">Collapsible</span>
  <span class="component">Trigger</span> <span class="property">pad</span> <span class="value">12</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">6</span> <span class="property">hor</span> <span class="property">gap</span> <span class="value">8</span> <span class="property">ver-cen</span>
    <span class="component">Icon</span> <span class="property">icon</span> <span class="string">"chevron-right"</span> <span class="property">size</span> <span class="value">14</span>
    <span class="component">Text</span> <span class="string">"Advanced Options"</span>
  <span class="component">Content</span> <span class="property">pad</span> <span class="value">12</span>
    <span class="component">Text</span> <span class="property">col</span> <span class="value">#888</span> <span class="string">"Additional settings appear here."</span></pre>

      <div class="rule-box">
        <h4>Collapsible Slots</h4>
        <ul>
          <li><code class="inline-code">Trigger</code> – The clickable toggle</li>
          <li><code class="inline-code">Content</code> – The collapsible content</li>
        </ul>
        <h4 style="margin-top: 12px;">States</h4>
        <ul>
          <li><code class="inline-code">collapsed</code> – Content hidden (default)</li>
          <li><code class="inline-code">expanded</code> – Content visible</li>
        </ul>
      </div>

      <!-- ===================== DROPDOWN ===================== -->
      <h3 id="lib-dropdown">Dropdown</h3>
      <p>
        A menu that appears below its trigger on click. Closes automatically when clicking outside or selecting an item.
      </p>

      <pre><span class="component">Dropdown</span>
  <span class="component">Trigger</span> <span class="property">pad</span> <span class="value">8 12</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">6</span> <span class="property">bor</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#333</span> <span class="property">hor</span> <span class="property">gap</span> <span class="value">8</span> <span class="property">ver-cen</span>
    <span class="component">Text</span> <span class="string">"Options"</span>
    <span class="component">Icon</span> <span class="property">icon</span> <span class="string">"chevron-down"</span> <span class="property">size</span> <span class="value">14</span>
  <span class="component">Content</span> <span class="property">ver</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">8</span> <span class="property">pad</span> <span class="value">4</span> <span class="property">bor</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#333</span> <span class="property">min-w</span> <span class="value">150</span>
    <span class="component">Item</span> <span class="property">pad</span> <span class="value">8 12</span> <span class="property">rad</span> <span class="value">4</span> <span class="property">hover-col</span> <span class="value">#333</span> <span class="string">"Profile"</span>
    <span class="component">Item</span> <span class="string">"Settings"</span>
    <span class="component">Separator</span> <span class="property">h</span> <span class="value">1</span> <span class="property">col</span> <span class="value">#333</span> <span class="property">mar</span> <span class="value">u-d 4</span>
    <span class="component">Item</span> <span class="property">col</span> <span class="value">#EF4444</span> <span class="string">"Logout"</span></pre>

      <div class="preview preview-col" style="align-items: flex-start; gap: 4px;">
        <div style="padding: 8px 12px; background: #1A1A23; border-radius: 6px; border: 1px solid #333; display: inline-flex; gap: 8px; align-items: center; cursor: pointer;">
          <span style="color: white; font-size: 13px;">Options</span>
          <span style="color: #666; font-size: 10px;">▼</span>
        </div>
        <div style="background: #1A1A23; border-radius: 8px; padding: 4px; border: 1px solid #333; min-width: 150px;">
          <div style="padding: 8px 12px; border-radius: 4px; color: white; font-size: 13px; cursor: pointer;">Profile</div>
          <div style="padding: 8px 12px; border-radius: 4px; color: white; font-size: 13px; cursor: pointer;">Settings</div>
          <div style="height: 1px; background: #333; margin: 4px 0;"></div>
          <div style="padding: 8px 12px; border-radius: 4px; color: #EF4444; font-size: 13px; cursor: pointer;">Logout</div>
        </div>
      </div>

      <div class="rule-box">
        <h4>Dropdown Slots</h4>
        <ul>
          <li><code class="inline-code">Trigger</code> – Button that opens the menu</li>
          <li><code class="inline-code">Content</code> – The dropdown menu container</li>
          <li><code class="inline-code">Item</code> – A menu item (use <code>-</code> for multiple)</li>
          <li><code class="inline-code">Separator</code> – A dividing line</li>
        </ul>
        <h4 style="margin-top: 12px;">States</h4>
        <ul>
          <li><code class="inline-code">closed</code> – Menu hidden (default)</li>
          <li><code class="inline-code">open</code> – Menu visible</li>
        </ul>
      </div>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create a dropdown with "Edit", "Duplicate", and "Delete" options. Make "Delete" red.</p>
        <div class="mirror-editor" data-code="Dropdown
  Trigger col #1A1A23 pad 8 12 rad 6 bor 1 boc #333
    &quot;Actions&quot;
  Content col #1A1A23 rad 8 pad 4 ver
    Item pad 8 12 rad 4 hover-col #333 &quot;Edit&quot;
    Item &quot;Duplicate&quot;
    Item &quot;Delete&quot;" data-preview-height="180"></div>
      </div>

      <!-- ===================== SELECT ===================== -->
      <h3 id="lib-select">Select</h3>
      <p>
        A styled dropdown for selecting a single value. Replaces native <code>&lt;select&gt;</code> with full styling control.
      </p>

      <pre><span class="component">Select</span>
  <span class="component">Trigger</span> <span class="property">pad</span> <span class="value">10 14</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">6</span> <span class="property">bor</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#333</span> <span class="property">w</span> <span class="value">200</span> <span class="property">hor</span> <span class="property">between</span> <span class="property">ver-cen</span>
    <span class="component">Text</span> <span class="string">"Select country..."</span>
    <span class="component">Icon</span> <span class="property">icon</span> <span class="string">"chevron-down"</span> <span class="property">size</span> <span class="value">14</span> <span class="property">col</span> <span class="value">#666</span>
  <span class="component">Content</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">8</span> <span class="property">pad</span> <span class="value">4</span> <span class="property">bor</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#333</span>
    <span class="component">Item</span> <span class="property">value</span> <span class="string">"de"</span> <span class="property">pad</span> <span class="value">8 12</span> <span class="property">rad</span> <span class="value">4</span> <span class="property">hover-col</span> <span class="value">#333</span> <span class="string">"Germany"</span>
    <span class="component">Item</span> <span class="property">value</span> <span class="string">"fr"</span> <span class="string">"France"</span>
    <span class="component">Item</span> <span class="property">value</span> <span class="string">"uk"</span> <span class="string">"United Kingdom"</span>
    <span class="component">Item</span> <span class="property">value</span> <span class="string">"us"</span> <span class="string">"United States"</span></pre>

      <div class="rule-box">
        <h4>Select Slots</h4>
        <ul>
          <li><code class="inline-code">Trigger</code> – Shows current selection, opens on click</li>
          <li><code class="inline-code">Content</code> – The options container</li>
          <li><code class="inline-code">Item</code> – An option (requires <code>value</code> property)</li>
        </ul>
        <h4 style="margin-top: 12px;">Item States</h4>
        <ul>
          <li><code class="inline-code">unselected</code> – Not the current value</li>
          <li><code class="inline-code">selected</code> – Currently selected item</li>
        </ul>
      </div>

      <p>
        Access the selected value via <code class="inline-code">SelectName.value</code>:
      </p>

      <pre><span class="component">Select</span> <span class="component">Country</span>:
  <span class="comment">// ... slots</span>

<span class="component">Text</span> <span class="string">"Selected: "</span> <span class="component">Country</span>.<span class="property">value</span></pre>

      <!-- ===================== CONTEXT MENU ===================== -->
      <h3 id="lib-context-menu">Context Menu</h3>
      <p>
        A menu that appears on right-click. Same structure as Dropdown but triggered differently.
      </p>

      <pre><span class="component">ContextMenu</span>
  <span class="component">Trigger</span> <span class="property">w</span> <span class="value">200</span> <span class="property">h</span> <span class="value">120</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">8</span> <span class="property">cen</span>
    <span class="component">Text</span> <span class="property">col</span> <span class="value">#666</span> <span class="string">"Right-click here"</span>
  <span class="component">Content</span> <span class="property">ver</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">8</span> <span class="property">pad</span> <span class="value">4</span> <span class="property">bor</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#333</span>
    <span class="component">Item</span> <span class="property">pad</span> <span class="value">8 12</span> <span class="property">rad</span> <span class="value">4</span> <span class="property">hover-col</span> <span class="value">#333</span> <span class="string">"Cut"</span>
    <span class="component">Item</span> <span class="string">"Copy"</span>
    <span class="component">Item</span> <span class="string">"Paste"</span>
    <span class="component">Separator</span> <span class="property">h</span> <span class="value">1</span> <span class="property">col</span> <span class="value">#333</span> <span class="property">mar</span> <span class="value">u-d 4</span>
    <span class="component">Item</span> <span class="property">col</span> <span class="value">#EF4444</span> <span class="string">"Delete"</span></pre>

      <div class="rule-box">
        <h4>ContextMenu Slots</h4>
        <ul>
          <li><code class="inline-code">Trigger</code> – Area that responds to right-click</li>
          <li><code class="inline-code">Content</code> – The menu that appears</li>
          <li><code class="inline-code">Item</code> – Menu options</li>
          <li><code class="inline-code">Separator</code> – Dividing line</li>
        </ul>
      </div>

      <!-- ===================== TOOLTIP ===================== -->
      <h3 id="lib-tooltip">Tooltip</h3>
      <p>
        A small hint that appears on hover. Automatically positioned to stay visible.
      </p>

      <pre><span class="component">Tooltip</span>
  <span class="component">Trigger</span>
    <span class="component">Button</span> <span class="property">col</span> <span class="value">#333</span> <span class="property">pad</span> <span class="value">8</span> <span class="property">rad</span> <span class="value">6</span>
      <span class="component">Icon</span> <span class="property">icon</span> <span class="string">"help-circle"</span> <span class="property">size</span> <span class="value">16</span>
  <span class="component">Content</span> <span class="property">pad</span> <span class="value">8 12</span> <span class="property">col</span> <span class="value">#333</span> <span class="property">rad</span> <span class="value">6</span> <span class="property">size</span> <span class="value">12</span>
    <span class="string">"Click for help"</span></pre>

      <div class="preview" style="gap: 16px; align-items: center;">
        <div style="position: relative;">
          <div style="background: #333; padding: 8px; border-radius: 6px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 14px;">?</span>
          </div>
          <div style="position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #333; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: white; white-space: nowrap;">
            Click for help
          </div>
        </div>
      </div>

      <div class="rule-box">
        <h4>Tooltip Slots</h4>
        <ul>
          <li><code class="inline-code">Trigger</code> – Element that shows tooltip on hover</li>
          <li><code class="inline-code">Content</code> – The tooltip content</li>
        </ul>
        <h4 style="margin-top: 12px;">Position</h4>
        <p style="margin: 8px 0 0 0;">Add position after Tooltip: <code class="inline-code">Tooltip above</code>, <code class="inline-code">Tooltip below</code>, <code class="inline-code">Tooltip left</code>, <code class="inline-code">Tooltip right</code></p>
      </div>

      <!-- ===================== POPOVER ===================== -->
      <h3 id="lib-popover">Popover</h3>
      <p>
        Like Tooltip but opens on click and can contain interactive content.
      </p>

      <pre><span class="component">Popover</span>
  <span class="component">Trigger</span>
    <span class="component">Button</span> <span class="property">col</span> <span class="value">#2271c1</span> <span class="property">pad</span> <span class="value">8 16</span> <span class="property">rad</span> <span class="value">6</span> <span class="string">"Share"</span>
  <span class="component">Content</span> <span class="property">ver</span> <span class="property">gap</span> <span class="value">12</span> <span class="property">pad</span> <span class="value">16</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">8</span> <span class="property">w</span> <span class="value">240</span> <span class="property">bor</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#333</span>
    <span class="component">Title</span> <span class="property">weight</span> <span class="value">600</span> <span class="string">"Share this project"</span>
    <span class="component">Input</span> <span class="property">placeholder</span> <span class="string">"Enter email..."</span>
    <span class="component">Button</span> <span class="property">col</span> <span class="value">#2271c1</span> <span class="property">pad</span> <span class="value">8 16</span> <span class="property">rad</span> <span class="value">6</span> <span class="string">"Send Invite"</span></pre>

      <div class="rule-box">
        <h4>Popover Slots</h4>
        <ul>
          <li><code class="inline-code">Trigger</code> – Element that opens popover on click</li>
          <li><code class="inline-code">Content</code> – The popover content (can contain interactive elements)</li>
        </ul>
        <h4 style="margin-top: 12px;">States</h4>
        <ul>
          <li><code class="inline-code">closed</code> – Popover hidden</li>
          <li><code class="inline-code">open</code> – Popover visible</li>
        </ul>
      </div>

      <!-- ===================== HOVER CARD ===================== -->
      <h3 id="lib-hover-card">HoverCard</h3>
      <p>
        A rich preview that appears on hover. Useful for user profiles, link previews, or quick info.
      </p>

      <pre><span class="component">HoverCard</span>
  <span class="component">Trigger</span>
    <span class="component">Link</span> <span class="property">col</span> <span class="value">#3B82F6</span> <span class="string">"@johndoe"</span>
  <span class="component">Content</span> <span class="property">ver</span> <span class="property">gap</span> <span class="value">12</span> <span class="property">pad</span> <span class="value">16</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">12</span> <span class="property">w</span> <span class="value">280</span> <span class="property">bor</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#333</span>
    <span class="component">Header</span> <span class="property">hor</span> <span class="property">gap</span> <span class="value">12</span> <span class="property">ver-cen</span>
      <span class="component">Avatar</span> <span class="property">w</span> <span class="value">48</span> <span class="property">h</span> <span class="value">48</span> <span class="property">rad</span> <span class="value">24</span> <span class="property">col</span> <span class="value">#2271c1</span> <span class="property">cen</span> <span class="string">"JD"</span>
      <span class="component">Info</span> <span class="property">ver</span>
        <span class="component">Name</span> <span class="property">weight</span> <span class="value">600</span> <span class="string">"John Doe"</span>
        <span class="component">Handle</span> <span class="property">col</span> <span class="value">#888</span> <span class="property">size</span> <span class="value">13</span> <span class="string">"@johndoe"</span>
    <span class="component">Bio</span> <span class="property">col</span> <span class="value">#888</span> <span class="property">size</span> <span class="value">14</span> <span class="string">"Designer and developer. Building tools for creative people."</span></pre>

      <div class="rule-box">
        <h4>HoverCard Slots</h4>
        <ul>
          <li><code class="inline-code">Trigger</code> – Element that shows card on hover</li>
          <li><code class="inline-code">Content</code> – The card content</li>
        </ul>
      </div>

      <!-- ===================== CHECKBOX ===================== -->
      <h3 id="lib-checkbox">Checkbox</h3>
      <p>
        A styled checkbox with customizable indicator and label.
      </p>

      <pre><span class="component">Checkbox</span>
  <span class="component">Indicator</span> <span class="property">w</span> <span class="value">18</span> <span class="property">h</span> <span class="value">18</span> <span class="property">rad</span> <span class="value">4</span> <span class="property">bor</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#555</span> <span class="property">cen</span>
    <span class="keyword">state</span> <span class="value">unchecked</span>
      <span class="property">col</span> <span class="value">transparent</span>
    <span class="keyword">state</span> <span class="value">checked</span>
      <span class="property">col</span> <span class="value">#2271c1</span> <span class="property">boc</span> <span class="value">#2271c1</span>
      <span class="component">Icon</span> <span class="property">icon</span> <span class="string">"check"</span> <span class="property">size</span> <span class="value">12</span>
  <span class="component">Label</span> <span class="string">"I agree to the terms"</span></pre>

      <div class="preview" style="gap: 16px;">
        <div style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <div style="width: 18px; height: 18px; border-radius: 4px; border: 1px solid #555; background: transparent;"></div>
          <span style="color: white; font-size: 14px;">Unchecked</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <div style="width: 18px; height: 18px; border-radius: 4px; background: #2271c1; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 10px;">✓</span>
          </div>
          <span style="color: white; font-size: 14px;">Checked</span>
        </div>
      </div>

      <div class="rule-box">
        <h4>Checkbox Slots</h4>
        <ul>
          <li><code class="inline-code">Indicator</code> – The checkbox box (contains check mark when checked)</li>
          <li><code class="inline-code">Label</code> – Text label</li>
        </ul>
        <h4 style="margin-top: 12px;">States</h4>
        <ul>
          <li><code class="inline-code">unchecked</code> – Not selected (default)</li>
          <li><code class="inline-code">checked</code> – Selected</li>
        </ul>
      </div>

      <p>
        Access the checked state via <code class="inline-code">CheckboxName.checked</code>:
      </p>

      <pre><span class="component">Checkbox</span> <span class="component">Terms</span>:
  <span class="comment">// ... slots</span>

<span class="component">Button</span> <span class="keyword">if</span> <span class="component">Terms</span>.<span class="property">checked</span> <span class="keyword">then</span> <span class="keyword">-primary</span> <span class="keyword">else</span> <span class="keyword">-disabled</span> <span class="string">"Continue"</span></pre>

      <!-- ===================== SWITCH ===================== -->
      <h3 id="lib-switch">Switch</h3>
      <p>
        A toggle switch for binary settings. More visual than a checkbox.
      </p>

      <pre><span class="component">Switch</span>
  <span class="component">Track</span> <span class="property">w</span> <span class="value">44</span> <span class="property">h</span> <span class="value">24</span> <span class="property">rad</span> <span class="value">12</span>
    <span class="keyword">state</span> <span class="value">off</span>
      <span class="property">col</span> <span class="value">#333</span>
    <span class="keyword">state</span> <span class="value">on</span>
      <span class="property">col</span> <span class="value">#2271c1</span>
  <span class="component">Thumb</span> <span class="property">w</span> <span class="value">20</span> <span class="property">h</span> <span class="value">20</span> <span class="property">rad</span> <span class="value">10</span> <span class="property">col</span> <span class="value">white</span></pre>

      <div class="preview" style="gap: 24px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 24px; background: #333; border-radius: 12px; position: relative; cursor: pointer;">
            <div style="width: 20px; height: 20px; background: white; border-radius: 10px; position: absolute; top: 2px; left: 2px;"></div>
          </div>
          <span style="color: #888; font-size: 13px;">Off</span>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 24px; background: #2271c1; border-radius: 12px; position: relative; cursor: pointer;">
            <div style="width: 20px; height: 20px; background: white; border-radius: 10px; position: absolute; top: 2px; right: 2px;"></div>
          </div>
          <span style="color: white; font-size: 13px;">On</span>
        </div>
      </div>

      <div class="rule-box">
        <h4>Switch Slots</h4>
        <ul>
          <li><code class="inline-code">Track</code> – The background track</li>
          <li><code class="inline-code">Thumb</code> – The moving circle</li>
        </ul>
        <h4 style="margin-top: 12px;">States</h4>
        <ul>
          <li><code class="inline-code">off</code> – Not active (default)</li>
          <li><code class="inline-code">on</code> – Active</li>
        </ul>
      </div>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create a Switch with a "Dark Mode" label. Change the track color to green when on.</p>
        <div class="mirror-editor" data-code="Row hor gap 12 ver-cen
  Switch
    Track w 44 h 24 rad 12 col #333
    Thumb w 20 h 20 rad 10 col white
  Text &quot;Dark Mode&quot;" data-preview-height="80"></div>
      </div>

      <!-- ===================== SLIDER ===================== -->
      <h3 id="lib-slider">Slider</h3>
      <p>
        A range input for selecting a value within a range.
      </p>

      <pre><span class="component">Slider</span> <span class="property">min</span> <span class="value">0</span> <span class="property">max</span> <span class="value">100</span> <span class="property">value</span> <span class="value">65</span> <span class="property">step</span> <span class="value">1</span>
  <span class="component">Track</span> <span class="property">h</span> <span class="value">6</span> <span class="property">col</span> <span class="value">#333</span> <span class="property">rad</span> <span class="value">3</span>
  <span class="component">Range</span> <span class="property">col</span> <span class="value">#2271c1</span>
  <span class="component">Thumb</span> <span class="property">w</span> <span class="value">18</span> <span class="property">h</span> <span class="value">18</span> <span class="property">rad</span> <span class="value">9</span> <span class="property">col</span> <span class="value">white</span> <span class="property">shadow</span> <span class="value">sm</span></pre>

      <div class="preview">
        <div style="width: 200px; position: relative;">
          <div style="height: 6px; background: #333; border-radius: 3px; position: relative;">
            <div style="position: absolute; left: 0; top: 0; width: 65%; height: 100%; background: #2271c1; border-radius: 3px;"></div>
          </div>
          <div style="width: 18px; height: 18px; background: white; border-radius: 9px; position: absolute; top: -6px; left: calc(65% - 9px); box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
      </div>

      <div class="rule-box">
        <h4>Slider Slots</h4>
        <ul>
          <li><code class="inline-code">Track</code> – The background track</li>
          <li><code class="inline-code">Range</code> – The filled portion (0 to current value)</li>
          <li><code class="inline-code">Thumb</code> – The draggable handle</li>
        </ul>
        <h4 style="margin-top: 12px;">Properties</h4>
        <ul>
          <li><code class="inline-code">min</code> – Minimum value</li>
          <li><code class="inline-code">max</code> – Maximum value</li>
          <li><code class="inline-code">value</code> – Current value</li>
          <li><code class="inline-code">step</code> – Increment step</li>
        </ul>
      </div>

      <!-- ===================== PROGRESS ===================== -->
      <h3 id="lib-progress">Progress</h3>
      <p>
        A progress indicator showing completion status.
      </p>

      <pre><span class="component">Progress</span> <span class="property">value</span> <span class="value">75</span> <span class="property">max</span> <span class="value">100</span>
  <span class="component">Track</span> <span class="property">h</span> <span class="value">8</span> <span class="property">col</span> <span class="value">#333</span> <span class="property">rad</span> <span class="value">4</span>
  <span class="component">Indicator</span> <span class="property">col</span> <span class="value">#10B981</span></pre>

      <div class="preview">
        <div style="width: 200px; height: 8px; background: #333; border-radius: 4px; overflow: hidden;">
          <div style="width: 75%; height: 100%; background: #10B981;"></div>
        </div>
      </div>

      <div class="rule-box">
        <h4>Progress Slots</h4>
        <ul>
          <li><code class="inline-code">Track</code> – The background bar</li>
          <li><code class="inline-code">Indicator</code> – The filled portion</li>
        </ul>
        <h4 style="margin-top: 12px;">Properties</h4>
        <ul>
          <li><code class="inline-code">value</code> – Current progress</li>
          <li><code class="inline-code">max</code> – Maximum value (default 100)</li>
        </ul>
      </div>

      <!-- ===================== TOAST ===================== -->
      <h3 id="lib-toast">Toast</h3>
      <p>
        A notification message that appears temporarily.
      </p>

      <pre><span class="component">Toast</span>
  <span class="component">Content</span> <span class="property">hor</span> <span class="property">gap</span> <span class="value">12</span> <span class="property">ver-cen</span> <span class="property">pad</span> <span class="value">16</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">8</span> <span class="property">bor</span> <span class="value">1</span> <span class="property">boc</span> <span class="value">#333</span>
    <span class="component">Icon</span> <span class="property">icon</span> <span class="string">"check-circle"</span> <span class="property">col</span> <span class="value">#10B981</span>
    <span class="component">Info</span> <span class="property">ver</span>
      <span class="component">Title</span> <span class="property">weight</span> <span class="value">600</span> <span class="string">"Success"</span>
      <span class="component">Description</span> <span class="property">col</span> <span class="value">#888</span> <span class="property">size</span> <span class="value">13</span> <span class="string">"Your changes have been saved."</span>
    <span class="component">Close</span> <span class="keyword">onclick</span> <span class="keyword">close</span>
      <span class="component">Icon</span> <span class="property">icon</span> <span class="string">"x"</span> <span class="property">size</span> <span class="value">14</span> <span class="property">col</span> <span class="value">#666</span></pre>

      <div class="preview">
        <div style="display: flex; gap: 12px; align-items: center; padding: 16px; background: #1A1A23; border-radius: 8px; border: 1px solid #333;">
          <span style="color: #10B981; font-size: 20px;">✓</span>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: white; font-size: 14px;">Success</div>
            <div style="color: #888; font-size: 13px;">Your changes have been saved.</div>
          </div>
          <span style="color: #666; cursor: pointer;">×</span>
        </div>
      </div>

      <div class="rule-box">
        <h4>Toast Slots</h4>
        <ul>
          <li><code class="inline-code">Content</code> – The toast container</li>
          <li><code class="inline-code">Title</code> – Main message</li>
          <li><code class="inline-code">Description</code> – Additional details</li>
          <li><code class="inline-code">Close</code> – Dismiss button</li>
        </ul>
        <h4 style="margin-top: 12px;">Trigger</h4>
        <p style="margin: 8px 0 0 0;">Use <code class="inline-code">show ToastName</code> action to display a toast.</p>
      </div>

      <!-- ===================== AVATAR ===================== -->
      <h3 id="lib-avatar">Avatar</h3>
      <p>
        User avatar with image and fallback initials.
      </p>

      <pre><span class="component">Avatar</span>
  <span class="component">Image</span> <span class="property">src</span> <span class="string">"https://i.pravatar.cc/48"</span>
  <span class="component">Fallback</span> <span class="property">cen</span> <span class="property">weight</span> <span class="value">600</span> <span class="string">"JD"</span></pre>

      <div class="preview" style="gap: 16px;">
        <div style="width: 48px; height: 48px; border-radius: 24px; overflow: hidden;">
          <img src="https://i.pravatar.cc/48" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        <div style="width: 48px; height: 48px; border-radius: 24px; background: #2271c1; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
          JD
        </div>
      </div>

      <div class="rule-box">
        <h4>Avatar Slots</h4>
        <ul>
          <li><code class="inline-code">Image</code> – The user image (shown if loadable)</li>
          <li><code class="inline-code">Fallback</code> – Shown if image fails or is missing</li>
        </ul>
      </div>

      <h4>Avatar Sizes</h4>
      <pre><span class="component">Avatar:</span> <span class="property">rad</span> <span class="value">50%</span>
  <span class="component">Image</span>:
  <span class="component">Fallback</span>: <span class="property">cen</span> <span class="property">weight</span> <span class="value">600</span> <span class="property">col</span> <span class="value">#2271c1</span>

<span class="component">Avatar</span> <span class="property">w</span> <span class="value">32</span> <span class="property">h</span> <span class="value">32</span> <span class="property">size</span> <span class="value">12</span>    <span class="comment">// Small</span>
<span class="component">Avatar</span> <span class="property">w</span> <span class="value">48</span> <span class="property">h</span> <span class="value">48</span> <span class="property">size</span> <span class="value">16</span>    <span class="comment">// Medium</span>
<span class="component">Avatar</span> <span class="property">w</span> <span class="value">64</span> <span class="property">h</span> <span class="value">64</span> <span class="property">size</span> <span class="value">20</span>    <span class="comment">// Large</span></pre>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create an Avatar with a fallback showing "AB" and a blue background.</p>
        <div class="mirror-editor" data-code="Avatar w 48 h 48 rad 24 col #2271c1 cen
  Text weight 600 &quot;AB&quot;" data-preview-height="100"></div>
      </div>

    </section>
```

---

## TEIL 2: Erweiterungen bestehender Kapitel

---

### 2.1 ERWEITERUNG: Tokens – Property-Referenzen

**Einfügen nach:** Unterabschnitt "Token Hierarchy" im Tokens-Kapitel
**Vor:** `</section>` des Tokens-Kapitels

```html
      <h3 id="component-references">Component Property References</h3>
      <p>
        Beyond tokens, you can reference properties from defined components. This creates relationships between design elements.
      </p>

      <pre><span class="comment">// Define a component with properties</span>
<span class="component">Card:</span> <span class="property">rad</span> <span class="value">16</span> <span class="property">pad</span> <span class="value">20</span> <span class="property">col</span> <span class="value">#2A2A3E</span>

<span class="comment">// Reference its properties elsewhere</span>
<span class="component">Button</span> <span class="property">rad</span> <span class="component">Card</span>.<span class="property">rad</span> <span class="property">col</span> <span class="component">Card</span>.<span class="property">col</span> <span class="string">"Same style"</span>
<span class="component">Tooltip</span> <span class="property">rad</span> <span class="component">Card</span>.<span class="property">rad</span> <span class="string">"Consistent corners"</span></pre>

      <p>
        When <code class="inline-code">Card.rad</code> changes, all references update automatically. This is powerful for maintaining consistency.
      </p>

      <h4>Design System Pattern</h4>
      <p>
        Create dedicated components that hold design primitives:
      </p>

      <pre><span class="comment">// Design primitives as "token" components</span>
<span class="component">Spacing:</span> <span class="property">pad</span> <span class="value">16</span> <span class="property">gap</span> <span class="value">12</span>
<span class="component">Radius:</span> <span class="property">rad</span> <span class="value">8</span>
<span class="component">Theme:</span> <span class="property">col</span> <span class="value">#1E1E2E</span>

<span class="comment">// Apply consistently</span>
<span class="component">Card</span> <span class="property">pad</span> <span class="component">Spacing</span>.<span class="property">pad</span> <span class="property">gap</span> <span class="component">Spacing</span>.<span class="property">gap</span> <span class="property">rad</span> <span class="component">Radius</span>.<span class="property">rad</span> <span class="property">col</span> <span class="component">Theme</span>.<span class="property">col</span>
<span class="component">Panel</span> <span class="property">pad</span> <span class="component">Spacing</span>.<span class="property">pad</span> <span class="property">rad</span> <span class="component">Radius</span>.<span class="property">rad</span> <span class="property">col</span> <span class="component">Theme</span>.<span class="property">col</span></pre>

      <p class="why">
        <strong>Why reference components?</strong> Tokens are great for values, but component references let you express relationships. "This button should match the card's roundness" is more meaningful than "this button has radius 16". When the card changes, the button follows.
      </p>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create a <code class="inline-code">Theme</code> component with <code class="inline-code">col</code> and <code class="inline-code">rad</code>, then use <code class="inline-code">Theme.col</code> and <code class="inline-code">Theme.rad</code> on a Card and Button.</p>
        <div class="mirror-editor" data-code="$primary: #2271c1

Card col #1a1a23 pad 16 rad 8 gap 12
  Text &quot;Card content&quot;
  Button col $primary pad 8 16 rad 8 &quot;Action&quot;" data-preview-height="140"></div>
      </div>
```

---

### 2.2 ERWEITERUNG: Layout – Scroll Properties

**Einfügen nach:** Unterabschnitt "Grid" im Layout-Kapitel
**Vor:** Rule-Box "Layout Quick Reference"

```html
      <h3 id="scroll">Scroll</h3>
      <p>
        Make containers scrollable when content overflows. Essential for feeds, lists, and carousels.
      </p>

      <h4>Vertical Scroll</h4>
      <p>
        Use <code class="inline-code">scroll</code> for vertically scrollable content like chat messages or long lists:
      </p>

      <pre><span class="component">ChatFeed</span> <span class="property">h</span> <span class="value">300</span> <span class="property">scroll</span> <span class="property">ver</span> <span class="property">gap</span> <span class="value">8</span>
  <span class="keyword">each</span> <span class="token">$msg</span> <span class="keyword">in</span> <span class="token">$messages</span>
    <span class="component">Message</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">pad</span> <span class="value">12</span> <span class="property">rad</span> <span class="value">8</span> <span class="token">$msg.text</span></pre>

      <div class="preview">
        <div style="height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 8px; width: 200px;">
          <div style="background: #1A1A23; padding: 12px; border-radius: 8px; color: white; font-size: 13px; flex-shrink: 0;">Message 1</div>
          <div style="background: #1A1A23; padding: 12px; border-radius: 8px; color: white; font-size: 13px; flex-shrink: 0;">Message 2</div>
          <div style="background: #1A1A23; padding: 12px; border-radius: 8px; color: white; font-size: 13px; flex-shrink: 0;">Message 3</div>
          <div style="background: #1A1A23; padding: 12px; border-radius: 8px; color: white; font-size: 13px; flex-shrink: 0;">Message 4</div>
        </div>
      </div>

      <h4>Horizontal Carousel</h4>
      <p>
        <code class="inline-code">scroll-hor</code> enables horizontal scrolling. Add <code class="inline-code">snap</code> to make items snap into place:
      </p>

      <pre><span class="component">Carousel</span> <span class="property">scroll-hor</span> <span class="property">snap</span> <span class="property">hor</span> <span class="property">gap</span> <span class="value">16</span>
  <span class="component">Slide</span> <span class="value">280</span> <span class="value">180</span> <span class="property">col</span> <span class="value">#1A1A23</span> <span class="property">rad</span> <span class="value">12</span> <span class="property">shrink</span> <span class="value">0</span> <span class="property">cen</span> <span class="string">"Slide 1"</span>
  <span class="component">Slide</span> <span class="string">"Slide 2"</span>
  <span class="component">Slide</span> <span class="string">"Slide 3"</span></pre>

      <div class="preview">
        <div style="display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 8px; max-width: 100%;">
          <div style="width: 200px; height: 100px; background: #1A1A23; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white; scroll-snap-align: start;">Slide 1</div>
          <div style="width: 200px; height: 100px; background: #1A1A23; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white; scroll-snap-align: start;">Slide 2</div>
          <div style="width: 200px; height: 100px; background: #1A1A23; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white; scroll-snap-align: start;">Slide 3</div>
        </div>
      </div>

      <h4>Both Directions</h4>
      <p>
        <code class="inline-code">scroll-both</code> allows scrolling in both directions – useful for maps or large canvases:
      </p>

      <pre><span class="component">MapView</span> <span class="property">w</span> <span class="value">400</span> <span class="property">h</span> <span class="value">300</span> <span class="property">scroll-both</span>
  <span class="component">LargeMap</span> <span class="property">w</span> <span class="value">1200</span> <span class="property">h</span> <span class="value">900</span></pre>

      <div class="rule-box">
        <h4>Scroll Properties</h4>
        <ul>
          <li><code class="inline-code">scroll</code> / <code class="inline-code">scroll-ver</code> – Vertical scrolling</li>
          <li><code class="inline-code">scroll-hor</code> – Horizontal scrolling</li>
          <li><code class="inline-code">scroll-both</code> – Both directions</li>
          <li><code class="inline-code">snap</code> – Items snap into position</li>
          <li><code class="inline-code">clip</code> – Hide overflow without scrollbars</li>
        </ul>
      </div>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create a horizontal carousel of 4 cards with snap scrolling. Each card should be 220px wide.</p>
        <div class="mirror-editor" data-code="Carousel hor gap 12
  Card 220 140 col #1a1a23 rad 8 shrink 0 cen &quot;1&quot;
  Card &quot;2&quot;
  Card &quot;3&quot;
  Card &quot;4&quot;" data-preview-height="180"></div>
      </div>
```

---

### 2.3 ERWEITERUNG: Interactivity – Bedingte Actions & Change

**Einfügen nach:** Unterabschnitt "Actions" im Interactivity-Kapitel
**Vor:** Rule-Box oder nächstem Unterabschnitt

```html
      <h3 id="conditional-actions">Conditional Actions</h3>
      <p>
        Actions can include inline conditions. Execute different actions based on state:
      </p>

      <pre><span class="component">Button</span> <span class="keyword">onclick</span> <span class="keyword">if</span> <span class="token">$isLoggedIn</span> <span class="keyword">page</span> <span class="component">Dashboard</span> <span class="keyword">else</span> <span class="keyword">open</span> <span class="component">LoginDialog</span> <span class="string">"Continue"</span></pre>

      <p>
        The pattern is: <code class="inline-code">onclick if condition action else action</code>
      </p>

      <pre><span class="comment">// More examples</span>
<span class="component">Button</span> <span class="keyword">onclick</span> <span class="keyword">if</span> <span class="token">$cart.count</span> > <span class="value">0</span> <span class="keyword">page</span> <span class="component">Checkout</span> <span class="keyword">else</span> <span class="keyword">open</span> <span class="component">EmptyCartWarning</span> <span class="string">"Checkout"</span>

<span class="component">Link</span> <span class="keyword">onclick</span> <span class="keyword">if</span> <span class="token">$hasChanges</span> <span class="keyword">open</span> <span class="component">ConfirmDialog</span> <span class="keyword">else</span> <span class="keyword">page</span> <span class="component">Home</span> <span class="string">"Leave"</span></pre>

      <h3 id="change-action">The Change Action</h3>
      <p>
        While <code class="inline-code">toggle</code> switches between states, <code class="inline-code">change</code> explicitly sets a specific state:
      </p>

      <pre><span class="comment">// Set self to a specific state</span>
<span class="component">Button</span> <span class="keyword">onclick</span> <span class="keyword">change</span> <span class="value">self</span> <span class="keyword">to</span> <span class="value">active</span> <span class="string">"Activate"</span>

<span class="comment">// Change another component's state</span>
<span class="component">Button</span> <span class="keyword">onclick</span> <span class="keyword">change</span> <span class="component">Panel</span> <span class="keyword">to</span> <span class="value">expanded</span> <span class="string">"Expand Panel"</span>

<span class="comment">// Multiple states</span>
<span class="component">Tab:</span> <span class="property">pad</span> <span class="value">12</span>
  <span class="keyword">state</span> <span class="value">inactive</span>
    <span class="property">col</span> <span class="value">transparent</span>
  <span class="keyword">state</span> <span class="value">active</span>
    <span class="property">col</span> <span class="value">#2271c1</span>
  <span class="keyword">state</span> <span class="value">disabled</span>
    <span class="property">opacity</span> <span class="value">0.5</span>

<span class="component">Tab</span> <span class="keyword">onclick</span> <span class="keyword">change</span> <span class="value">self</span> <span class="keyword">to</span> <span class="value">active</span> <span class="string">"Tab 1"</span></pre>

      <p class="why">
        <strong>toggle vs change:</strong> Use <code>toggle</code> when switching between exactly two states (like on/off). Use <code>change</code> when you need to set a specific state, especially when there are more than two states or when you want explicit control.
      </p>

      <div class="exercise">
        <div class="exercise-label">Try it</div>
        <p class="exercise-task">Create a button that navigates to "Dashboard" if <code class="inline-code">$loggedIn</code> is true, otherwise opens a "LoginPrompt" dialog.</p>
        <div class="mirror-editor" data-code="$loggedIn: false

Button col #2271c1 pad 12 rad 8 onclick toggle &quot;Toggle Login&quot;

Text col #888
  if $loggedIn then &quot;You are logged in&quot; else &quot;Please log in&quot;" data-preview-height="120"></div>
      </div>
```

---

### 2.4 ERWEITERUNG: Quick Reference

**Ersetzen:** Die bestehende Quick Reference Section erweitern
**Diese Abschnitte zur bestehenden Quick Reference hinzufügen:**

```html
      <h3>Shortcuts</h3>
      <div class="rule-box">
        <ul>
          <li><code class="inline-code">Box 300 400</code> – Dimension shorthand (w h)</li>
          <li><code class="inline-code">Image "url" 100 100</code> – Image with size</li>
          <li><code class="inline-code">#RRGGBBAA</code> – Color with alpha (8-digit hex)</li>
          <li><code class="inline-code">$name-col</code> – Token with property suffix</li>
          <li><code class="inline-code">Component.prop</code> – Property reference</li>
        </ul>
      </div>

      <h3>Modifiers</h3>
      <div class="rule-box">
        <ul>
          <li><code class="inline-code">-primary</code> – Primary action style</li>
          <li><code class="inline-code">-secondary</code> – Secondary style</li>
          <li><code class="inline-code">-outlined</code> – Transparent with border</li>
          <li><code class="inline-code">-ghost</code> – Fully transparent</li>
          <li><code class="inline-code">-disabled</code> – 50% opacity, not interactive</li>
          <li><code class="inline-code">-rounded</code> – Fully rounded (pill/circle)</li>
        </ul>
      </div>

      <h3>Library Components</h3>
      <div class="rule-box">
        <ul>
          <li><code class="inline-code">Tabs</code> – TabList, Tab, TabContent, Panel</li>
          <li><code class="inline-code">Accordion</code> – AccordionItem, Trigger, Content</li>
          <li><code class="inline-code">Collapsible</code> – Trigger, Content</li>
          <li><code class="inline-code">Dropdown</code> – Trigger, Content, Item, Separator</li>
          <li><code class="inline-code">Select</code> – Trigger, Content, Item</li>
          <li><code class="inline-code">ContextMenu</code> – Trigger, Content, Item</li>
          <li><code class="inline-code">Tooltip</code> / <code class="inline-code">Popover</code> / <code class="inline-code">HoverCard</code> – Trigger, Content</li>
          <li><code class="inline-code">Checkbox</code> – Indicator, Label (states: unchecked, checked)</li>
          <li><code class="inline-code">Switch</code> – Track, Thumb (states: off, on)</li>
          <li><code class="inline-code">Slider</code> – Track, Range, Thumb (min, max, value, step)</li>
          <li><code class="inline-code">Progress</code> – Track, Indicator (value, max)</li>
          <li><code class="inline-code">Toast</code> – Content, Title, Description, Close</li>
          <li><code class="inline-code">Avatar</code> – Image, Fallback</li>
        </ul>
      </div>

      <h3>Additional Actions</h3>
      <div class="rule-box">
        <ul>
          <li><code class="inline-code">change self to state</code> – Set own state explicitly</li>
          <li><code class="inline-code">change Component to state</code> – Set another component's state</li>
          <li><code class="inline-code">onclick if cond action else action</code> – Conditional action</li>
        </ul>
      </div>
```

---

## TEIL 3: Zusammenfassung der Einfügepositionen

| Inhalt | Position | Nach Element |
|--------|----------|--------------|
| Syntax Shortcuts | Neues Kapitel | `</section>` von #components |
| Modifiers | Neues Kapitel | `</section>` von #forms |
| Library Components | Neues Kapitel | `</section>` von #slots |
| Property-Referenzen | Erweiterung Tokens | "Token Hierarchy" Abschnitt |
| Scroll Properties | Erweiterung Layout | "Grid" Abschnitt |
| Bedingte Actions | Erweiterung Interactivity | "Actions" Abschnitt |
| Quick Reference | Erweiterung | Vor `</section>` von #reference |

---

## TEIL 4: Checkliste für Integration

- [ ] Section `#syntax-shortcuts` einfügen
- [ ] Section `#modifiers` einfügen
- [ ] Section `#library` einfügen (großes Kapitel)
- [ ] Tokens-Kapitel um "Component Property References" erweitern
- [ ] Layout-Kapitel um "Scroll" erweitern
- [ ] Interactivity-Kapitel um "Conditional Actions" und "Change Action" erweitern
- [ ] Quick Reference um neue Abschnitte erweitern
- [ ] Navigation/TOC aktualisieren (falls vorhanden)
- [ ] Testen aller interaktiven Editoren
