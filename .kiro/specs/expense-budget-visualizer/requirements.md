# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side, single-page web application that allows users to track personal expenses, visualize spending by category, and manage a monthly budget through a spending limit. The application is built entirely with HTML, CSS, and Vanilla JavaScript — no framework or backend is involved. All data is persisted in the browser's localStorage. The application supports light and dark themes and is fully responsive across desktop, tablet, and mobile viewports.

---

## Glossary

- **App**: The Expense & Budget Visualizer single-page application running in the browser.
- **Transaction**: A single expense record consisting of an id, item name, amount (USD), and category.
- **Category**: One of the predefined expense groupings — Food, Transport, or Fun — plus a fallback "other" for unrecognized values.
- **Spending Limit**: A user-defined monetary threshold against which total spending is compared.
- **Progress Bar**: The visual indicator inside the Spending Limit card that reflects the ratio of total spending to the spending limit.
- **Chart**: The doughnut chart rendered by Chart.js 4.4.4 that shows spending distribution across categories.
- **Theme**: The active color scheme of the App — either "light" or "dark".
- **localStorage**: The browser Web Storage API used to persist application state between sessions.
- **Sort Order**: The user-selected ordering applied to the transaction list display.
- **State**: The in-memory JavaScript object that holds the current transactions array, spending limit, active theme, and sort order.

---

## Requirements

### Requirement 1 — Transaction Entry

**User Story:** As a user, I want to add an expense transaction with a name, amount, and category, so that my spending is recorded accurately.

#### Acceptance Criteria

1. THE App SHALL provide a form containing an item name text field, an amount number field, and a category dropdown.
2. WHEN the user submits the form without entering an item name, THE App SHALL display an inline error message adjacent to the item name field and prevent submission.
3. WHEN the user submits the form with an amount field that is empty, non-numeric, or less than or equal to zero, THE App SHALL display an inline error message adjacent to the amount field and prevent submission.
4. WHEN the user submits the form without selecting a category, THE App SHALL display an inline error message adjacent to the category dropdown and prevent submission.
5. WHEN the user corrects an invalid field, THE App SHALL clear the corresponding inline error message immediately upon input.
6. WHEN a valid form is submitted, THE App SHALL create a Transaction with a unique id, the trimmed item name, the amount rounded to two decimal places, and the selected category.
7. WHEN a Transaction is created, THE App SHALL append it to the State transactions array, persist the updated array to localStorage under the key `ebv_transactions`, and reset the form to its default empty state.
8. WHEN a Transaction is created, THE App SHALL return focus to the item name field.

---

### Requirement 2 — Transaction List Display

**User Story:** As a user, I want to see all my transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE App SHALL render the transaction list from the State transactions array each time the State changes.
2. WHEN the State transactions array is empty, THE App SHALL display an empty-state message in place of the list.
3. WHEN the State transactions array contains one or more Transactions, THE App SHALL hide the empty-state message and render each Transaction as a list item showing a category emoji badge, the item name, the category label, and the formatted amount.
4. THE App SHALL apply HTML escaping to the item name and category when injecting them into the DOM to prevent cross-site scripting.
5. WHILE the transaction list contains more items than fit in the visible area, THE App SHALL allow vertical scrolling within the list container without affecting the rest of the page layout.
6. WHEN a Transaction item is rendered, THE App SHALL display a delete button within that item labeled with the item name for accessibility.

---

### Requirement 3 — Transaction Deletion

**User Story:** As a user, I want to delete a transaction, so that I can remove incorrect or unwanted expense entries.

#### Acceptance Criteria

1. WHEN the user clicks the delete button on a Transaction item, THE App SHALL remove that Transaction from the State transactions array using its unique id.
2. WHEN a Transaction is deleted, THE App SHALL persist the updated transactions array to localStorage and re-render all UI sections.
3. THE App SHALL use event delegation on the transaction list container to handle delete button clicks.

---

### Requirement 4 — Total Spending Display

**User Story:** As a user, I want to see my total spending at a glance, so that I know how much I have spent overall.

#### Acceptance Criteria

1. THE App SHALL display the sum of all Transaction amounts formatted as a USD currency string in the summary card.
2. WHEN the State transactions array changes, THE App SHALL recalculate and re-render the total spending amount.
3. WHEN the State transactions array is empty, THE App SHALL display "$0.00" as the total spending amount.

---

### Requirement 5 — Spending Limit

**User Story:** As a user, I want to set a spending limit and see my progress against it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL provide a numeric input field and a "Set" button within the Spending Limit card for entering a spending limit value.
2. WHEN the user activates the "Set" button or presses Enter in the limit input, THE App SHALL read the input value, update the State spending limit, and persist it to localStorage under the key `ebv_limit`.
3. IF the spending limit input value is not a valid number or is negative, THEN THE App SHALL ignore the submission and return focus to the limit input.
4. WHEN the spending limit is set to a value greater than zero, THE App SHALL make the Progress Bar visible.
5. WHEN the spending limit is set to zero or not set, THE App SHALL hide the Progress Bar section.
6. WHILE the Progress Bar is visible and total spending is less than 75% of the spending limit, THE App SHALL render the Progress Bar fill in green.
7. WHILE the Progress Bar is visible and total spending is at least 75% but less than 100% of the spending limit, THE App SHALL render the Progress Bar fill in orange.
8. WHILE the Progress Bar is visible and total spending equals or exceeds the spending limit, THE App SHALL render the Progress Bar fill in red and display a warning message.
9. THE App SHALL cap the Progress Bar fill width at 100% of the track width regardless of how far spending exceeds the limit.
10. THE App SHALL display the formatted spent amount and the formatted limit amount as text labels alongside the Progress Bar.

---

### Requirement 6 — Spending Distribution Chart

**User Story:** As a user, I want to see a visual breakdown of spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE App SHALL render a doughnut Chart using Chart.js 4.4.4 that shows one segment per Category with spending amount.
2. WHEN the State transactions array is empty, THE App SHALL hide the Chart and display an empty-state message in its place.
3. WHEN the State transactions array contains one or more Transactions, THE App SHALL aggregate transaction amounts by Category and update the Chart data.
4. WHEN an existing Chart instance is present and the State changes, THE App SHALL update the Chart in place rather than destroying and recreating it.
5. THE App SHALL display Category labels and percentage tooltips on the Chart using the format `$amount (percentage%)`.
6. THE App SHALL assign distinct colors to the Food, Transport, and Fun categories, and assign fallback colors to any additional categories.

---

### Requirement 7 — Transaction Sort

**User Story:** As a user, I want to sort my transaction list by different criteria, so that I can find and analyze expenses more easily.

#### Acceptance Criteria

1. THE App SHALL provide a sort dropdown with options: Newest first (default), Amount ascending, Amount descending, and Category A–Z.
2. WHEN the user changes the sort dropdown selection, THE App SHALL re-render the transaction list in the selected order without mutating the State transactions array.
3. WHEN the sort order is "Newest first", THE App SHALL render Transactions in reverse insertion order.
4. WHEN the user selects a sort option, THE App SHALL persist the selection to localStorage under the key `ebv_sort`.

---

### Requirement 8 — Dark/Light Theme Toggle

**User Story:** As a user, I want to switch between dark and light modes, so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a theme toggle button in the header that switches between light and dark themes.
2. WHEN the user activates the theme toggle, THE App SHALL toggle the `data-theme` attribute on the `<html>` element between "light" and "dark", update the toggle button icon, and persist the new theme to localStorage under the key `ebv_theme`.
3. WHEN the Theme is "dark", THE App SHALL apply dark surface colors, dark text colors, and dark border colors via CSS custom properties scoped to `[data-theme="dark"]`.
4. WHEN the Theme changes and a Chart instance exists, THE App SHALL update the Chart legend label color to match the new Theme.

---

### Requirement 9 — Data Persistence

**User Story:** As a user, I want my transactions, spending limit, theme, and sort preference to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN the App initializes, THE App SHALL read the `ebv_transactions`, `ebv_limit`, `ebv_theme`, and `ebv_sort` keys from localStorage and restore the State from those values.
2. IF the `ebv_transactions` localStorage value is missing or cannot be parsed as JSON, THEN THE App SHALL initialize the transactions array to an empty array.
3. WHEN State data is written to localStorage, THE App SHALL serialize the transactions array as JSON and store numeric and string values as plain strings.

---

### Requirement 10 — Responsive Layout

**User Story:** As a user, I want to use the application on any device screen size, so that the layout remains usable on desktop, tablet, and mobile.

#### Acceptance Criteria

1. THE App SHALL render the add-transaction form and the spending chart in a two-column side-by-side grid on viewports wider than 768px.
2. WHEN the viewport width is 768px or less, THE App SHALL collapse the two-column grid to a single-column stacked layout.
3. WHEN the viewport width is 480px or less, THE App SHALL reduce card padding, font sizes, and badge dimensions to maintain usability on small screens.
4. THE App SHALL constrain the main content area to a maximum width of 900px and center it horizontally on wide viewports.

---

### Requirement 11 — Accessibility

**User Story:** As a user relying on keyboard navigation or assistive technology, I want interactive elements to be operable and announced correctly, so that I can use the application without a pointer device.

#### Acceptance Criteria

1. THE App SHALL provide visible focus indicators on all interactive elements when navigated by keyboard.
2. THE App SHALL associate each form input with a visible label element using matching `for` and `id` attributes.
3. THE App SHALL render inline validation error messages in elements with `role="alert"` so that screen readers announce errors on update.
4. THE App SHALL include an `aria-label` on the delete button for each Transaction that incorporates the transaction item name.
5. THE App SHALL render the Progress Bar track element with `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow` attributes kept current with the fill percentage.
6. THE App SHALL provide a visually hidden `<label>` for the spending limit input using the `sr-only` utility class.
