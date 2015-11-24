class Foo(foo: String) {
  def bar() = println(foo)
}

object Main extends App {
  val foo = new Foo("test")
  foo.bar2()
}
