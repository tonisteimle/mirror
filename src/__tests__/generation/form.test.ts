import { describe, it, expect } from 'vitest';
import {
  buildForm,
  validateForm
} from '../../services/generation/builders/form';
import {
  FormInput,
  parseForm,
  validateFormInput
} from '../../services/generation/schemas/form';
import {
  generateFormFromSchema
} from '../../services/generation/experts/form';

describe('Form Builder', () => {
  describe('MVP: Simple login form', () => {
    it('generates correct Mirror code for minimal login', () => {
      const input: FormInput = {
        fields: [
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'password', name: 'password', label: 'Password', required: true }
        ],
        submit: { label: 'Sign In' }
      };

      const result = buildForm(input);

      // Should contain token definitions (surface-based design)
      expect(result).toContain('$bg:');
      expect(result).toContain('$input:');
      expect(result).toContain('$input-focus:');
      expect(result).toContain('$text:');
      expect(result).toContain('$primary:');
      expect(result).toContain('$error:');

      // Should contain modular definitions
      expect(result).toContain('Label:');
      expect(result).toContain('LabelRequired:');
      expect(result).toContain('TextInput:');
      expect(result).toContain('Field:');
      expect(result).toContain('Error ""');

      // Should contain focus state (surface-based, no borders)
      expect(result).toContain('focus');
      expect(result).toContain('bg $input-focus');

      // Should contain invalid state (border allowed for errors)
      expect(result).toContain('state invalid');
      // InputWrapper defines the error border in state invalid
      expect(result).toContain('bor 1, boc $error');
      expect(result).toContain('Error visible');

      // Should contain Form container
      expect(result).toContain('Form ver');
      expect(result).toContain('bg $bg');

      // Should contain PrimaryButton (inherits from Button)
      expect(result).toContain('PrimaryButton from Button');
      expect(result).toContain('bg $primary');
    });

    it('generates FieldRequired for required fields', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Should contain FieldRequired definition with asterisk (standalone, not from Field)
      expect(result).toContain('FieldRequired:');
      expect(result).toContain('Asterisk " *"');
      expect(result).toContain('col $error');

      // Should use FieldRequired for required fields (Text for label in LabelRequired)
      expect(result).toContain('FieldRequired Text "Name"');
    });

    it('uses Field for non-required fields', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Should NOT contain FieldRequired
      expect(result).not.toContain('FieldRequired');

      // Should use Field with Label (not Text, since not required)
      expect(result).toContain('Field Label "Name"');
    });

    it('generates PasswordField with toggle', () => {
      const input: FormInput = {
        fields: [
          { type: 'password', name: 'password', label: 'Password', showToggle: true }
        ],
        submit: { label: 'Login' }
      };

      const result = buildForm(input);

      // Should contain PasswordInput primitive with toggle (inherits from InputWrapper)
      expect(result).toContain('PasswordInput from InputWrapper');
      expect(result).toContain('Toggle');
      // Uses named Icon for proper state coupling
      expect(result).toContain('Icon named EyeIcon, "eye"');
      expect(result).toContain('EyeIcon "eye-off"');
      expect(result).toContain('onclick toggle-state self');

      // Should contain on/off states for toggle coupling
      expect(result).toContain('state on');
      expect(result).toContain('state Toggle.on');
      expect(result).toContain('Input type text');

      // Should contain PasswordField pattern
      expect(result).toContain('PasswordField:');
    });

    it('generates TextareaField', () => {
      const input: FormInput = {
        fields: [
          { type: 'textarea', name: 'message', label: 'Message', rows: 5 }
        ],
        submit: { label: 'Send' }
      };

      const result = buildForm(input);

      // Should contain TextareaInput primitive (inherits from InputWrapper)
      expect(result).toContain('TextareaInput from InputWrapper');
      expect(result).toContain('minh 100');

      // Should contain TextareaField pattern
      expect(result).toContain('TextareaField:');

      // Should use TextareaField for textarea fields
      expect(result).toContain('TextareaField Label "Message"');
    });
  });

  describe('Field instances', () => {
    it('generates correct field instance with placeholder', () => {
      const input: FormInput = {
        fields: [
          { type: 'email', name: 'email', label: 'Email', placeholder: 'you@example.com' }
        ],
        submit: { label: 'Submit' }
      };

      const result = buildForm(input);

      expect(result).toContain('Input type email, "you@example.com"');
    });

    it('generates correct field instance with helper text', () => {
      const input: FormInput = {
        fields: [
          { type: 'password', name: 'password', label: 'Password', helper: 'At least 8 characters' }
        ],
        submit: { label: 'Submit' }
      };

      const result = buildForm(input);

      // Helper is visible by default now, no need for explicit "visible"
      expect(result).toContain('Helper "At least 8 characters"');
    });

    it('handles disabled fields', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'readonly', label: 'Readonly', disabled: true }
        ],
        submit: { label: 'Submit' }
      };

      const result = buildForm(input);

      expect(result).toContain('Input "", disabled');
    });
  });

  describe('Required styles', () => {
    it('generates asterisk style by default', () => {
      const input: FormInput = {
        requiredStyle: 'asterisk',
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('Asterisk " *"');
    });

    it('generates text style when configured', () => {
      const input: FormInput = {
        requiredStyle: 'text',
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('Required "(required)"');
    });

    it('generates dot style when configured', () => {
      const input: FormInput = {
        requiredStyle: 'dot',
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('Dot');
      expect(result).toContain('rad 999');
    });

    it('generates no indicator when style is none', () => {
      const input: FormInput = {
        requiredStyle: 'none',
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Should still use FieldRequired but without visual indicator
      expect(result).not.toContain('Asterisk');
      expect(result).not.toContain('Required "');
      expect(result).not.toContain('Dot');
    });
  });

  describe('Density', () => {
    it('generates compact spacing', () => {
      const input: FormInput = {
        density: 'compact',
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Compact: Form gap=12, Field gap=3, inputPadding=[6,10], fontSize=11
      expect(result).toContain('Form ver, gap 12');
      expect(result).toContain('gap 3');  // Field gap
      expect(result).toContain('pad 6 10');
      expect(result).toContain('fs 11');  // Label fontSize
    });

    it('generates default spacing', () => {
      const input: FormInput = {
        density: 'default',
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Default: fieldGap=16, labelGap=4, inputPadding=[10,12], fontSize=13
      expect(result).toContain('gap 16');
      expect(result).toContain('gap 4');
      expect(result).toContain('pad 10 12');
      expect(result).toContain('fs 13');
    });

    it('generates spacious spacing', () => {
      const input: FormInput = {
        density: 'spacious',
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Spacious: fieldGap=24, labelGap=6, inputPadding=[14,16], fontSize=14
      expect(result).toContain('gap 24');
      expect(result).toContain('gap 6');
      expect(result).toContain('pad 14 16');
      expect(result).toContain('fs 14');
    });
  });

  describe('Actions', () => {
    it('generates single submit button', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('PrimaryButton from Button');
      expect(result).toContain('PrimaryButton "Save"');
    });

    it('generates submit and cancel buttons', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        submit: { label: 'Save' },
        cancel: { label: 'Cancel' }
      };

      const result = buildForm(input);

      expect(result).toContain('PrimaryButton from Button');
      expect(result).toContain('GhostButton from Button');
      expect(result).toContain('Actions hor');
      expect(result).toContain('PrimaryButton "Save"');
      expect(result).toContain('GhostButton "Cancel"');
    });

    it('generates actions from array', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        actions: [
          { type: 'submit', label: 'Save', variant: 'primary' },
          { type: 'cancel', label: 'Cancel', variant: 'ghost' }
        ]
      };

      const result = buildForm(input);

      expect(result).toContain('PrimaryButton "Save"');
      expect(result).toContain('GhostButton "Cancel"');
    });

    it('generates danger button', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'confirm', label: 'Type DELETE' }
        ],
        actions: [
          { type: 'submit', label: 'Delete Account', variant: 'danger' }
        ]
      };

      const result = buildForm(input);

      expect(result).toContain('DangerButton from Button');
      expect(result).toContain('DangerButton "Delete Account"');
    });
  });

  describe('Container styling', () => {
    it('applies container background', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        container: { background: 'elevated' },
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('$bg: #27272A');
    });

    it('applies container padding', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        container: { padding: 'xl' },
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('pad 32');
    });

    it('uses surface-based design without container border', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        container: { border: true }, // Border option is ignored in surface-based design
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Surface-based design: no borders on container, only backgrounds
      expect(result).toContain('Form ver');
      expect(result).toContain('bg $bg');
      // Border only appears in error states
      expect(result).not.toMatch(/Form.*bor/);
    });

    it('applies container shadow', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        container: { shadow: 'md' },
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('shadow md');
    });
  });

  describe('Validation', () => {
    it('validates correct input', () => {
      const input = {
        fields: [{ type: 'text', name: 'name', label: 'Name' }],
        submit: { label: 'Save' }
      };

      const result = validateFormInput(input);
      expect(result.success).toBe(true);
    });

    it('rejects empty fields array', () => {
      const input = {
        fields: [],
        submit: { label: 'Save' }
      };

      const result = validateFormInput(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing fields and sections', () => {
      const input = {
        submit: { label: 'Save' }
      };

      const result = validateFormInput(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid field type', () => {
      const input = {
        fields: [{ type: 'invalid', name: 'name', label: 'Name' }],
        submit: { label: 'Save' }
      };

      const result = validateFormInput(input);
      expect(result.success).toBe(false);
    });

    it('rejects missing field name', () => {
      const input = {
        fields: [{ type: 'text', label: 'Name' }],
        submit: { label: 'Save' }
      };

      const result = validateFormInput(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Expert integration', () => {
    it('generateFormFromSchema works correctly', () => {
      const schema: FormInput = {
        fields: [
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'password', name: 'password', label: 'Password', required: true }
        ],
        submit: { label: 'Sign In' }
      };

      const result = generateFormFromSchema(schema);

      expect(result.success).toBe(true);
      expect(result.code).toContain('Field:');
      expect(result.code).toContain('Form ver');
      expect(result.schema).toEqual(schema);
    });

    it('generateFormFromSchema rejects invalid schema', () => {
      const schema = {
        fields: [],
        submit: { label: 'Save' }
      } as FormInput;

      const result = generateFormFromSchema(schema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Output format', () => {
    it('produces parseable Mirror code', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'firstName', label: 'First Name', required: true },
          { type: 'text', name: 'lastName', label: 'Last Name', required: true },
          { type: 'email', name: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
          { type: 'password', name: 'password', label: 'Password', helper: 'At least 8 characters', required: true, showToggle: true },
          { type: 'textarea', name: 'bio', label: 'Bio', placeholder: 'Tell us about yourself...', rows: 3 }
        ],
        submit: { label: 'Create Account' },
        cancel: { label: 'Cancel' }
      };

      const result = buildForm(input);

      // Log for manual inspection
      console.log('Generated Form Mirror code:');
      console.log(result);

      // Basic structure checks
      expect(result).toContain('Field:');
      expect(result).toContain('FieldRequired');
      expect(result).toContain('PasswordField:');
      expect(result).toContain('TextareaField:');
      expect(result).toContain('Form ver');
      expect(result.split('\n').length).toBeGreaterThan(20);
    });

    it('generates complete login form', () => {
      const input: FormInput = {
        fields: [
          { type: 'email', name: 'email', label: 'Email', placeholder: 'you@example.com', required: true },
          { type: 'password', name: 'password', label: 'Password', placeholder: '••••••••', required: true, showToggle: true }
        ],
        submit: { label: 'Sign In' }
      };

      const result = buildForm(input);

      console.log('Login Form:');
      console.log(result);

      // Should be a complete, renderable form
      expect(result).toContain('$bg:');
      expect(result).toContain('Field:');
      expect(result).toContain('PasswordField:');
      expect(result).toContain('Form ver');
      expect(result).toContain('PrimaryButton "Sign In"');
    });

    it('generates contact form with textarea', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true },
          { type: 'email', name: 'email', label: 'Email', required: true },
          { type: 'textarea', name: 'message', label: 'Message', placeholder: 'Your message...', rows: 5, required: true }
        ],
        submit: { label: 'Send Message' }
      };

      const result = buildForm(input);

      // Required fields use *Required variants (Text instead of Label for required)
      expect(result).toContain('TextareaField:');
      expect(result).toContain('TextareaFieldRequired:');
      expect(result).toContain('TextareaFieldRequired Text "Message"');
      expect(result).toContain('PrimaryButton "Send Message"');
    });
  });

  describe('parseForm defaults', () => {
    it('applies default layout', () => {
      const input = {
        fields: [{ type: 'text', name: 'name' }]
      };

      const parsed = parseForm(input);

      expect(parsed.layout).toBe('vertical');
      expect(parsed.labelPosition).toBe('top');
      expect(parsed.requiredStyle).toBe('asterisk');
      expect(parsed.density).toBe('default');
    });

    it('applies field defaults', () => {
      const input = {
        fields: [{ type: 'text', name: 'name' }]
      };

      const parsed = parseForm(input);

      expect(parsed.fields[0].required).toBe(false);
      expect(parsed.fields[0].disabled).toBe(false);
      expect(parsed.fields[0].size).toBe('md');
      expect(parsed.fields[0].variant).toBe('outline');
    });

    it('normalizes actions from shorthand', () => {
      const input = {
        fields: [{ type: 'text', name: 'name' }],
        submit: { label: 'Save' },
        cancel: { label: 'Cancel' }
      };

      const parsed = parseForm(input);

      expect(parsed.actions).toHaveLength(2);
      expect(parsed.actions[0].type).toBe('submit');
      expect(parsed.actions[0].label).toBe('Save');
      expect(parsed.actions[0].variant).toBe('primary');
      expect(parsed.actions[1].type).toBe('cancel');
      expect(parsed.actions[1].label).toBe('Cancel');
      expect(parsed.actions[1].variant).toBe('ghost');
    });
  });

  describe('labelPosition', () => {
    it('generates horizontal fields when labelPosition is left', () => {
      const input: FormInput = {
        labelPosition: 'left',
        fields: [
          { type: 'text', name: 'company', label: 'Company' },
          { type: 'email', name: 'email', label: 'Email' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Should contain FieldHorizontal definitions
      expect(result).toContain('FieldHorizontal:');
      expect(result).toContain('hor, ver-center, gap 16');
      expect(result).toContain('width 120, right');  // Label width
      expect(result).toContain('FieldContent');

      // Should use FieldHorizontal for instances
      expect(result).toContain('FieldHorizontal Label "Company"');
      expect(result).toContain('FieldHorizontal Label "Email"');
    });

    it('generates hidden label fields when labelPosition is hidden', () => {
      const input: FormInput = {
        labelPosition: 'hidden',
        fields: [
          { type: 'text', name: 'query', placeholder: 'Search...' }
        ],
        submit: { label: 'Search' }
      };

      const result = buildForm(input);

      // Should contain FieldHidden definition
      expect(result).toContain('FieldHidden:');

      // Should NOT contain Label definitions
      expect(result).not.toContain('Label:');

      // Should use FieldHidden for instances (no label)
      expect(result).toContain('FieldHidden Input "Search..."');
    });

    it('generates required horizontal fields with correct naming', () => {
      const input: FormInput = {
        labelPosition: 'left',
        requiredStyle: 'asterisk',
        fields: [
          { type: 'text', name: 'name', label: 'Name', required: true }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Should contain both required and non-required horizontal variants
      expect(result).toContain('FieldHorizontal:');
      expect(result).toContain('FieldHorizontalRequired:');

      // Should use required variant for required fields
      expect(result).toContain('FieldHorizontalRequired Text "Name"');
    });

    it('generates horizontal password fields', () => {
      const input: FormInput = {
        labelPosition: 'left',
        fields: [
          { type: 'password', name: 'password', label: 'Password', showToggle: true }
        ],
        submit: { label: 'Login' }
      };

      const result = buildForm(input);

      // Should contain horizontal password field
      expect(result).toContain('PasswordFieldHorizontal:');
      expect(result).toContain('PasswordFieldHorizontal Label "Password"');
    });

    it('generates horizontal textarea fields', () => {
      const input: FormInput = {
        labelPosition: 'left',
        fields: [
          { type: 'textarea', name: 'message', label: 'Message' }
        ],
        submit: { label: 'Send' }
      };

      const result = buildForm(input);

      // Should contain horizontal textarea field
      expect(result).toContain('TextareaFieldHorizontal:');
      // Textarea uses top alignment instead of ver-center
      expect(result).toContain('hor, top, gap 16');
      expect(result).toContain('TextareaFieldHorizontal Label "Message"');
    });

    it('defaults to top position', () => {
      const input: FormInput = {
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Should use standard vertical Field (not horizontal)
      expect(result).toContain('Field:');
      expect(result).toContain('ver, gap 4');
      expect(result).not.toContain('FieldHorizontal');
      expect(result).not.toContain('FieldHidden');
    });
  });

  // ===========================================================================
  // PHASE 2: Grid Layout
  // ===========================================================================

  describe('Grid Layout (Phase 2)', () => {
    it('generates grid container when columns > 1', () => {
      const input: FormInput = {
        columns: 2,
        fields: [
          { type: 'text', name: 'firstName', label: 'First Name' },
          { type: 'text', name: 'lastName', label: 'Last Name' },
          { type: 'email', name: 'email', label: 'Email' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Should contain grid container
      expect(result).toContain('FieldGrid grid 2');
      expect(result).toContain('gap 16');
    });

    it('generates grid container when layout is grid', () => {
      const input: FormInput = {
        layout: 'grid',
        columns: 3,
        fields: [
          { type: 'text', name: 'a', label: 'A' },
          { type: 'text', name: 'b', label: 'B' },
          { type: 'text', name: 'c', label: 'C' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('FieldGrid grid 3');
    });

    it('applies colSpan to spanning fields', () => {
      const input: FormInput = {
        columns: 2,
        fields: [
          { type: 'text', name: 'firstName', label: 'First Name' },
          { type: 'text', name: 'lastName', label: 'Last Name' },
          { type: 'email', name: 'email', label: 'Email', colSpan: 2 }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Email field should span 2 columns
      expect(result).toContain('grid-column span 2');
    });

    it('uses correct density gap in grid', () => {
      const input: FormInput = {
        columns: 2,
        density: 'compact',
        fields: [
          { type: 'text', name: 'a', label: 'A' },
          { type: 'text', name: 'b', label: 'B' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Compact density has fieldGap of 12
      expect(result).toContain('FieldGrid grid 2, gap 12');
    });

    it('does not use grid for single column', () => {
      const input: FormInput = {
        columns: 1,
        fields: [
          { type: 'text', name: 'name', label: 'Name' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Should NOT contain grid
      expect(result).not.toContain('FieldGrid');
    });
  });

  // ===========================================================================
  // PHASE 2: Select Fields
  // ===========================================================================

  describe('Select Fields (Phase 2)', () => {
    it('generates SelectInput definition', () => {
      const input: FormInput = {
        fields: [
          { type: 'select', name: 'country', label: 'Country' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Should contain SelectInput definition
      expect(result).toContain('SelectInput');
      expect(result).toContain('SelectField:');
    });

    it('generates SelectField with placeholder', () => {
      const input: FormInput = {
        fields: [
          { type: 'select', name: 'country', label: 'Country', placeholder: 'Choose a country...' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('SelectField Label "Country"');
      expect(result).toContain('Value "Choose a country..."');
    });

    it('generates SelectFieldRequired for required select', () => {
      const input: FormInput = {
        fields: [
          { type: 'select', name: 'category', label: 'Category', required: true }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('SelectFieldRequired:');
      expect(result).toContain('SelectFieldRequired Text "Category"');
    });

    it('generates SelectFieldHorizontal for left label position', () => {
      const input: FormInput = {
        labelPosition: 'left',
        fields: [
          { type: 'select', name: 'status', label: 'Status' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('SelectFieldHorizontal:');
      expect(result).toContain('SelectFieldHorizontal Label "Status"');
    });

    it('generates SelectFieldHidden for hidden label position', () => {
      const input: FormInput = {
        labelPosition: 'hidden',
        fields: [
          { type: 'select', name: 'filter', placeholder: 'All Categories' }
        ],
        submit: { label: 'Filter' }
      };

      const result = buildForm(input);

      expect(result).toContain('SelectFieldHidden:');
      expect(result).toContain('SelectFieldHidden Value "All Categories"');
    });

    it('default placeholder is "Select..."', () => {
      const input: FormInput = {
        fields: [
          { type: 'select', name: 'option', label: 'Option' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('Value "Select..."');
    });
  });

  // ===========================================================================
  // PHASE 3: Number Fields
  // ===========================================================================

  describe('Number Fields (Phase 3)', () => {
    it('generates NumberInput definition', () => {
      const input: FormInput = {
        fields: [
          { type: 'number', name: 'quantity', label: 'Quantity' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('NumberInput');
      expect(result).toContain('NumberField:');
    });

    it('generates NumberField with min/max/step', () => {
      const input: FormInput = {
        fields: [
          { type: 'number', name: 'quantity', label: 'Quantity', min: 0, max: 100, step: 1 }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('NumberField Label "Quantity"');
      expect(result).toContain('min 0');
      expect(result).toContain('max 100');
      expect(result).toContain('step 1');
    });

    it('generates NumberFieldRequired for required number', () => {
      const input: FormInput = {
        fields: [
          { type: 'number', name: 'amount', label: 'Amount', required: true }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('NumberFieldRequired:');
      expect(result).toContain('NumberFieldRequired Text "Amount"');
    });

    it('generates NumberFieldHorizontal for left label position', () => {
      const input: FormInput = {
        labelPosition: 'left',
        fields: [
          { type: 'number', name: 'price', label: 'Price' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('NumberFieldHorizontal:');
      expect(result).toContain('NumberFieldHorizontal Label "Price"');
    });

    it('generates NumberFieldHidden for hidden label position', () => {
      const input: FormInput = {
        labelPosition: 'hidden',
        fields: [
          { type: 'number', name: 'qty', placeholder: '0' }
        ],
        submit: { label: 'Update' }
      };

      const result = buildForm(input);

      expect(result).toContain('NumberFieldHidden:');
      expect(result).toContain('NumberFieldHidden Input "0"');
    });

    it('supports decimal step for currency', () => {
      const input: FormInput = {
        fields: [
          { type: 'number', name: 'price', label: 'Price', min: 0, step: 0.01 }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('step 0.01');
    });
  });

  // ===========================================================================
  // PHASE 2: Combined Features
  // ===========================================================================

  describe('Combined Phase 2 Features', () => {
    it('generates complete signup form with grid and select', () => {
      const input: FormInput = {
        layout: 'grid',
        columns: 2,
        fields: [
          { type: 'text', name: 'firstName', label: 'First Name', required: true },
          { type: 'text', name: 'lastName', label: 'Last Name', required: true },
          { type: 'email', name: 'email', label: 'Email', required: true, colSpan: 2 },
          { type: 'select', name: 'country', label: 'Country', placeholder: 'Select country...' },
          { type: 'select', name: 'language', label: 'Language', placeholder: 'Select language...' }
        ],
        submit: { label: 'Create Account' }
      };

      const result = buildForm(input);

      console.log('Signup Form with Grid and Select:');
      console.log(result);

      // Grid structure
      expect(result).toContain('FieldGrid grid 2');

      // Text fields
      expect(result).toContain('FieldRequired');

      // Select fields
      expect(result).toContain('SelectField:');
      expect(result).toContain('SelectField Label "Country"');
      expect(result).toContain('Value "Select country..."');

      // Email spans 2 columns
      expect(result).toContain('grid-column span 2');
    });
  });

  // ===========================================================================
  // PHASE 4: Checkbox, Radio, Switch
  // ===========================================================================

  describe('Checkbox Fields (Phase 4)', () => {
    it('generates CheckboxInput definition', () => {
      const input: FormInput = {
        fields: [
          { type: 'checkbox', name: 'terms', label: 'I agree to the terms' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('CheckboxInput:');
      expect(result).toContain('CheckboxField:');
    });

    it('generates CheckboxField with label', () => {
      const input: FormInput = {
        fields: [
          { type: 'checkbox', name: 'newsletter', label: 'Subscribe to newsletter' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('CheckboxField Text "Subscribe to newsletter"');
    });

    it('generates CheckboxFieldRequired for required checkbox', () => {
      const input: FormInput = {
        fields: [
          { type: 'checkbox', name: 'terms', label: 'I agree', required: true }
        ],
        submit: { label: 'Submit' }
      };

      const result = buildForm(input);

      expect(result).toContain('CheckboxFieldRequired:');
      expect(result).toContain('CheckboxFieldRequired Text "I agree"');
    });

    it('checkbox has state checked and disabled', () => {
      const input: FormInput = {
        fields: [
          { type: 'checkbox', name: 'test', label: 'Test' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('state checked');
      expect(result).toContain('state disabled');
    });
  });

  describe('Radio Fields (Phase 4)', () => {
    it('generates RadioInput definition', () => {
      const input: FormInput = {
        fields: [
          { type: 'radio', name: 'gender', label: 'Gender' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('RadioInput:');
      expect(result).toContain('RadioField:');
      expect(result).toContain('RadioGroup:');
    });

    it('generates RadioGroup with label', () => {
      const input: FormInput = {
        fields: [
          { type: 'radio', name: 'size', label: 'Size' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('RadioGroup Label "Size"');
      expect(result).toContain('RadioOptions');
    });

    it('generates RadioField with options', () => {
      const input: FormInput = {
        fields: [
          {
            type: 'radio',
            name: 'color',
            label: 'Color',
            options: [
              { value: 'red', label: 'Red' },
              { value: 'blue', label: 'Blue' },
              { value: 'green', label: 'Green' }
            ]
          }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('RadioField Text "Red"');
      expect(result).toContain('RadioField Text "Blue"');
      expect(result).toContain('RadioField Text "Green"');
    });

    it('generates RadioGroupRequired for required radio', () => {
      const input: FormInput = {
        fields: [
          { type: 'radio', name: 'payment', label: 'Payment Method', required: true }
        ],
        submit: { label: 'Pay' }
      };

      const result = buildForm(input);

      expect(result).toContain('RadioGroupRequired:');
      expect(result).toContain('RadioGroupRequired Label "Payment Method"');
    });

    it('radio has state checked', () => {
      const input: FormInput = {
        fields: [
          { type: 'radio', name: 'opt', label: 'Option' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('state checked');
    });
  });

  describe('Switch Fields (Phase 4)', () => {
    it('generates SwitchInput definition', () => {
      const input: FormInput = {
        fields: [
          { type: 'switch', name: 'darkMode', label: 'Dark Mode' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('SwitchInput:');
      expect(result).toContain('SwitchField:');
    });

    it('generates SwitchField with label', () => {
      const input: FormInput = {
        fields: [
          { type: 'switch', name: 'notifications', label: 'Enable notifications' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('SwitchField Text "Enable notifications"');
    });

    it('generates SwitchFieldReverse variant', () => {
      const input: FormInput = {
        fields: [
          { type: 'switch', name: 'setting', label: 'Setting' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      // Both variants should be generated
      expect(result).toContain('SwitchField:');
      expect(result).toContain('SwitchFieldReverse:');
    });

    it('switch has state on and disabled', () => {
      const input: FormInput = {
        fields: [
          { type: 'switch', name: 'test', label: 'Test' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('state on');
      expect(result).toContain('state disabled');
    });

    it('switch has thumb with translate for on state', () => {
      const input: FormInput = {
        fields: [
          { type: 'switch', name: 'toggle', label: 'Toggle' }
        ],
        submit: { label: 'Save' }
      };

      const result = buildForm(input);

      expect(result).toContain('Thumb');
      expect(result).toContain('translate');
    });
  });

  describe('Combined Phase 4 Features', () => {
    it('generates settings form with switches', () => {
      const input: FormInput = {
        fields: [
          { type: 'switch', name: 'darkMode', label: 'Dark Mode' },
          { type: 'switch', name: 'notifications', label: 'Push Notifications' },
          { type: 'switch', name: 'sound', label: 'Sound Effects' }
        ],
        submit: { label: 'Save Settings' }
      };

      const result = buildForm(input);

      console.log('Settings Form with Switches:');
      console.log(result);

      expect(result).toContain('SwitchField:');
      expect(result).toContain('SwitchField Text "Dark Mode"');
      expect(result).toContain('SwitchField Text "Push Notifications"');
      expect(result).toContain('SwitchField Text "Sound Effects"');
    });

    it('generates form with checkbox and radio', () => {
      const input: FormInput = {
        fields: [
          {
            type: 'radio',
            name: 'plan',
            label: 'Select Plan',
            options: [
              { value: 'free', label: 'Free' },
              { value: 'pro', label: 'Pro' }
            ]
          },
          { type: 'checkbox', name: 'terms', label: 'I agree to Terms', required: true }
        ],
        submit: { label: 'Continue' }
      };

      const result = buildForm(input);

      console.log('Form with Radio and Checkbox:');
      console.log(result);

      // Radio
      expect(result).toContain('RadioGroup Label "Select Plan"');
      expect(result).toContain('RadioField Text "Free"');
      expect(result).toContain('RadioField Text "Pro"');

      // Checkbox
      expect(result).toContain('CheckboxFieldRequired Text "I agree to Terms"');
    });
  });
});
