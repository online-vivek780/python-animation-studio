// Programs for the Playground. Add more here, no other file needs to change.
const examples = [
  {
    id: 'dogs',
    title: 'Dogs, a list and a loop',
    code: `class Dog:
    def __init__(self, name):
        self.name = name

    def bark(self):
        print(self.name, "says Woof!")

dogs = [Dog("Bruno"), Dog("Max")]

for dog in dogs:
    dog.bark()`,
  },
  {
    id: 'variables',
    title: 'Variables',
    code: `x = 10
x = 20
y = x + 5
print(x, y)`,
  },
  {
    id: 'squares',
    title: 'List and loop',
    code: `numbers = [1, 2, 3]

for num in numbers:
    square = num * num
    print(square)`,
  },
  {
    id: 'dictionary',
    title: 'Dictionary',
    code: `student = {"name": "Aman", "age": 20}
student["city"] = "Pune"
print(student["name"])`,
  },
  {
    id: 'function',
    title: 'Function',
    code: `def add(a, b):
    result = a + b
    return result

answer = add(5, 3)
print(answer)`,
  },
  {
    id: 'inheritance',
    title: 'Inheritance',
    code: `class Animal:
    def eat(self):
        print("Eating")

class Dog(Animal):
    def bark(self):
        print("Barking")

d = Dog()
d.eat()
d.bark()`,
  },
  {
    id: 'recursion',
    title: 'Recursion',
    code: `def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)

print(factorial(4))`,
  },
]

export default examples
