/**
 * Template: React/React Native Component Interaction Testing
 *
 * WHAT THIS TESTS:
 * User interactions with UI components — button presses, form input, modal
 * visibility, conditional rendering, loading/error/empty states.
 *
 * WHEN TO USE:
 * - Interactive components (buttons, forms, toggles)
 * - Modal/dialog show/hide logic
 * - Conditional rendering (loading, error, empty states)
 * - List rendering (FlatList, map)
 * - Navigation between views/screens
 *
 * SETUP:
 * npm install --save-dev @testing-library/react-native
 *   OR
 * npm install --save-dev @testing-library/react
 *
 * KEY PRINCIPLE: Test behavior, not implementation.
 * "When user presses Submit, form data is sent" — NOT "setState is called"
 */

// ADAPT: Import from the correct testing library
// import { render, fireEvent, waitFor } from '@testing-library/react-native';
// import MyComponent from '../components/MyComponent';

// ═══════════════════════════════════════════════════════════════════════════════
// Button Press → State Change
// ═══════════════════════════════════════════════════════════════════════════════

describe('interactive button', () => {
  test.skip('pressing button triggers the action', () => {
    // const onPress = jest.fn();
    // const { getByText } = render(<MyButton onPress={onPress} label="Submit" />);
    // fireEvent.press(getByText('Submit'));
    // expect(onPress).toHaveBeenCalledTimes(1);
  });

  test.skip('button is disabled during loading', () => {
    // const { getByText } = render(<MyButton loading={true} label="Submit" />);
    // const button = getByText('Submit');
    // expect(button.props.disabled).toBe(true);
    // OR: expect(button).toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Conditional Rendering (Loading / Error / Empty)
// ═══════════════════════════════════════════════════════════════════════════════

describe('conditional rendering', () => {
  test.skip('shows loading spinner when loading=true', () => {
    // const { getByTestId } = render(<MyList loading={true} items={[]} />);
    // expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  test.skip('shows error message when error is set', () => {
    // const { getByText } = render(<MyList error="Something went wrong" items={[]} />);
    // expect(getByText('Something went wrong')).toBeTruthy();
  });

  test.skip('shows empty state when items is empty and not loading', () => {
    // const { getByText } = render(<MyList loading={false} items={[]} />);
    // expect(getByText('No items yet')).toBeTruthy();
  });

  test.skip('renders items when provided', () => {
    // const items = [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }];
    // const { getByText } = render(<MyList items={items} />);
    // expect(getByText('Item 1')).toBeTruthy();
    // expect(getByText('Item 2')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Modal Show/Hide
// ═══════════════════════════════════════════════════════════════════════════════

describe('modal visibility', () => {
  test.skip('modal is hidden when visible=false', () => {
    // const { queryByTestId } = render(<MyModal visible={false} />);
    // expect(queryByTestId('modal-content')).toBeNull();
  });

  test.skip('modal is shown when visible=true', () => {
    // const { getByTestId } = render(<MyModal visible={true} />);
    // expect(getByTestId('modal-content')).toBeTruthy();
  });

  test.skip('close button calls onClose', () => {
    // const onClose = jest.fn();
    // const { getByText } = render(<MyModal visible={true} onClose={onClose} />);
    // fireEvent.press(getByText('Close'));
    // expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Form Input → Validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('form validation', () => {
  test.skip('shows validation error for empty required field', () => {
    // const { getByText, getByPlaceholderText } = render(<MyForm />);
    // fireEvent.changeText(getByPlaceholderText('Name'), '');
    // fireEvent.press(getByText('Submit'));
    // expect(getByText('Name is required')).toBeTruthy();
  });

  test.skip('clears validation error when field is corrected', async () => {
    // const { getByText, getByPlaceholderText, queryByText } = render(<MyForm />);
    // fireEvent.press(getByText('Submit')); // trigger error
    // fireEvent.changeText(getByPlaceholderText('Name'), 'Valid Name');
    // await waitFor(() => {
    //   expect(queryByText('Name is required')).toBeNull();
    // });
  });

  test.skip('successful submission calls onSubmit with form data', () => {
    // const onSubmit = jest.fn();
    // const { getByText, getByPlaceholderText } = render(<MyForm onSubmit={onSubmit} />);
    // fireEvent.changeText(getByPlaceholderText('Name'), 'Alice');
    // fireEvent.press(getByText('Submit'));
    // expect(onSubmit).toHaveBeenCalledWith({ name: 'Alice' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Accessibility
// ═══════════════════════════════════════════════════════════════════════════════

describe('accessibility', () => {
  test.skip('interactive elements have accessibility labels', () => {
    // const { getByLabelText } = render(<MyComponent />);
    // expect(getByLabelText('Submit form')).toBeTruthy();
    // expect(getByLabelText('Close dialog')).toBeTruthy();
  });

  test.skip('error messages are in a live region', () => {
    // const { getByRole } = render(<MyComponent error="Bad input" />);
    // const alert = getByRole('alert');
    // expect(alert).toBeTruthy();
  });
});
