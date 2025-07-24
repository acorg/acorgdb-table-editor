# acorgdb table editor

A VSCode extension for editing acorgdb JSON files in a tabular format.

https://github.com/user-attachments/assets/37330937-fdc5-4409-8840-f0f597b7c4b6

## Installation

1. Download the latest `.vsix` from the releases page.
2. In vscode open the extensions sidebar.
3. Click the three dots icon at top of the sidebar and click `Install from VSIX`.

## Usage

1. Open a `.json` file conforming to the acorgdb schema.
2. Run the `acorgdb: Edit as Titer Table` command from the command palette.

## Features

- **Live Editing**: Changes made in the table are instantly reflected in the underlying JSON file.
- **Unsaved Changes**: Modified cells are highlighted in green. The highlighting is removed once the file is saved.
- **Saving**: Use `Ctrl/Cmd+S` to save changes.
- **Navigation**:
    - Use the `Up Arrow` and `Down Arrow` keys to move between rows in the same column.
    - Use `Tab` and `Shift+Tab` to navigate between cells horizontally.
- **Row/Column Highlighting**: The current row and column are highlighted in light grey for better visibility.
