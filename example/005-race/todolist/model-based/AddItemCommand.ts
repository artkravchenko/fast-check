import { TodolistCommand, TodolistModel, TodolistReal, listTodos, sortTodos, ExtractedTodoItem } from './Model';
import { fireEvent } from '@testing-library/dom';

export class AddItemCommand implements TodolistCommand {
  constructor(readonly label: string) {}

  async check(m: TodolistModel) {
    return true;
  }

  async run(m: TodolistModel, r: TodolistReal) {
    const { wrapper } = m;

    const todosBefore = await listTodos(wrapper);
    fireEvent.change(wrapper.getByTestId('todo-new-item-input'), { target: { value: this.label } });
    fireEvent.click(wrapper.getByTestId('todo-new-item-button'));
    const todosAfter = await listTodos(wrapper);

    // We expect the todolist to have a new unchecked item with the added label (withour any specific ordering)
    const expectedTodos = [...todosBefore, { label: this.label, checked: false }];
    expect(sortTodos(todosAfter.map(extractItemData))).toEqual(sortTodos(expectedTodos.map(extractItemData)));
  }

  toString() {
    return `AddItem(${JSON.stringify(this.label)})`;
  }
}

// Helpers

const extractItemData = (todoItem: Pick<ExtractedTodoItem, 'label' | 'checked'>) => {
  return { label: todoItem.label, checked: todoItem.checked };
};
