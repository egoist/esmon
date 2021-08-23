import path from 'path'
import { b } from './example-b'
import { watch } from 'chokidar'

console.log(path.join(__dirname, b, 'xx'), watch)

function Bar() {
  return () => {}
}
@Bar()
export class Foo {
  bar() {}
}
