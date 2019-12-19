# lib-reflect

Utility project for helping with Reflection and Decorators in typescript.

- [lib-reflect](#lib-reflect)
  - [Getting Started](#getting-started)
  - [Running the tests](#running-the-tests)
  - [Reflection](#reflection)
  - [Decorators](#decorators)
  - [Dynamic](#dynamic)
  - [Example](#example)
      - [Example using Reflection and Decorators](#example-using-reflection-and-decorators)

## Getting Started

Clone the project. And run the standard commands to install packages in node.
```
npm i
```


## Running the tests
The tests are using **mocha** / **chai** 

For reporting **istanbul** is used
```
npm run coverage:test
```

## Reflection
The reflection system is made, so it's easy to use without working
with the reflect-metadata system directly.
```typescript
class MyTestClass{}
const myTestData: ClassData = ReflectHelper.getOrCreateClassData(MyTestClass);
console.log(myTestData);
```
The ***ClassData*** object contains information about the reflected class like:

1. The class name
2. The class constructor
3. The methods on the class
4. The properties on the class (with some limitations)
5. The attributes on the class
6. Any other information we need that does not fit into those categories

The following classes are available and contain reflection information
```typescript
class PropertyData {
  // Name of the property
  public name: string;
  // Attributes for the property
  public attributesData: AttributeData[];
  // The data type of the attribute
  public type: Function;
  // Tags attached to this property by various modules if needed
  public tags: { [key: string]: any };
}

class ParameterData {
  // The index of the parameter
  public idx: number;
  // The type of the parameter
  public target: Function;
  // Custom attribute data that decorators can add
  public attributesData: AttributeData[];
  // Tags attached to this method by various modules if needed
  public tags: { [key: string]: any };
}

class MethodData {
  // Name of the method to invoke on the controller
  public name: string;
  // The options applied on the method
  public attributesData: AttributeData[];
  // The parameters needed to the handler method
  public parameters: ParameterData[];
  // Flag indicating if this method has been processed or not
  //    We don't always decorate the parameters, the reflection system will try and get
  //    additional information from the typescript system, in order to do this we need to 'process'
  //    the method, this flag is indicating if the process has happened or not
  public processed = false;
  // Tags attached to this method by various modules if needed
  public tags: { [key: string]: any };
  // The return type of the function as taken from typescript
  public returnType: Function;
}

class ClassData {
  // Name of the class
  public name: string;
  // The constructor function
  public target: Function;
  // Attributes applied to the class
  public attributeData: AttributeData[];
  // Methods
  public methods: MethodData[];
  // Properties
  public properties: PropertyData[];
  // Extra data attached to the class
  public tags: { [key: string]: any };
}
```

## Decorators
Expose utility functions that use the Reflection system to ease the creation and management of decorators and decorator data.

One of the problem with reflect-metadata is that a method / property decorator is called before the class decorator. Using the functions bellow it does not matter what is called when, the implementation will take care of creating what is needed and sending the data to the handler.
The decorate call order will still be the same, however the class data will exist in all handlers regardless of the order.
```typescript
// Example of a Class Decorator created using the ClassDecoratorFactory
const classDecorator = (val:number): ClassDecorator => ClassDecoratorFactory(
  (cd: ClassData) => {
    cd.tags['MyCustomReflectionValue'] = val;
    // Manipulate the class reflection data if needed
  }
);

// Example of a Property Decorator created using the PropertyDecoratorFactory
const propertyDecorator = (val:number): PropertyDecorator => PropertyDecoratorFactory(
  (cd: ClassData, prop:PropertyData) => {
    // Manipulate the class / property reflection data if needed
    prop.tags['MyCustomPropertyValue'] = val;
  }
);

// Example of a Method Decorator created using the MethodDecoratorFactory
const methodDecorator = (val:number): MethodDecorator => MethodDecoratorFactory(
  (cd: ClassData, md:MethodData, descr: any) => {
    // Manipulate the class / method reflection data if needed
    md.tags['MethodCacheTimeout'] = val;
  }
);

// Example of a Argument Decorator created using the ParameterDecoratorFactory
const parameterDecorator = (): ParameterDecorator => ParameterDecoratorFactory(
  (cd: ClassData, md:MethodData, paramIdx: number) => {
    // Manipulate the class / method / argument reflection data if needed
  }
);

// Example of a Decorator that can be used to decorate anything created using the AnyDecoratorFactory
const anyDecorator = (): AnyDecorator => AnyDecoratorFactory(
  (cd: ClassData, arg1: MethodData | PropertyData | undefined, arg2: number | any) => {
    // Manipulate the class / property / method / argument reflection data if needed
  }
);
```

## Dynamic
Functionality for defining a class / methods at runtime, simple interface, simple to use, simple to understand

Not too much that can be said. The example contains 99% of all there is to it. Some methods have more optional arguments to improve utilisation.

Method chaining can be used.

```typescript
const MyClassDecorator = (): ClassDecorator => ClassDecoratorFactory(
  (cd: ClassData) => { cd.tags['dec'] = true; }
);
const MyPropDecorator = () => PropertyDecoratorFactory(
  (cd: ClassData, prop: PropertyData) => { prop.tags['dec'] = true; }
);
const MyMethodDecorator = () => MethodDecoratorFactory(
  (cd: ClassData, md: MethodData, descr: any) => { md.tags['dec'] = true; }
);
const MyParamDecorator = () => ParameterDecoratorFactory(
  (cd: ClassData, md: MethodData, p: ParameterData) => { p.tags['dec'] = true; }
);

const classData: ClassData = Dynamic.createClass('MyCustomDynamicClass', null, (dc: DynamicClass) => {
   // Add the class decorator
   dc.decorate(MyClassDecorator());
   // dc.decorate(AnotherDecorator);
   dc.addMethod('dynamicMethod', (dm: DynamicMethod) => {
      // Add the method decorator
      dm.decorate(MyMethodDecorator());
      // First argument
      dm.addParameter()
      // Second argument with decoration
      dm.addParameter((da: DynamicParameter) => {
         da.decorate(MyParamDecorator());
      });
      // Set the method body
      //    WARNING: Be carefull of using lambda here, you must understand the context of 'this'
      dm.addBody(function (arg1, arg2) { return arg1 + arg2; });
   });
   // Properties
   dc.addProperty('lastName');
   dc.addProperty('firstName', (dp: DynamicProperty) => {
      dp.decorate(MyPropDecorator());
      dp.setValue('YourFirstName');
   });
      
});
const instance = Reflect.create(classData.target, []);
// This will log 3
console.log(instance.dynamicMethod(1, 2));
// This will log all reflection info we have on the class
console.log(classData);

```

## Example
#### Example using Reflection and Decorators

Assume we can intercept a function call on a certain class, and we want to decorate the methods with some
additional functionality, like:
1. Caching
2. Return value override
3. Argument value override

Define a class decorator
```typescript
// Define a new ClassDecorator
const MyClassDecorator = (key: string, value: string) => ClassDecoratorFactory((cd: ClassData) => {
   cd.tags['MyCustomTag'] = (cd.tags['MyCustomTag'] || {})[key] = value;
});
```

Define the caching decorator

```typescript
// Method decorator, used to cache the function result
class CacheData extends MethodAttributeData {
   public ttl: number;
   public lastUpdate: number;
   public value: any;
}
// TTL is in milliseconds
const MethodCacheResult = (ttl: number) => MethodDecoratorFactory(
  (cd: ClassData, method: MethodData, desc: any) => {
    const cacheData = new CacheData();
    cacheData.ttl = ttl;
    method.attributesData.push(cacheData);
  }
);
```

Define the return value override decorator

```typescript
// Method decorator used to set the return value
const MethodReturnValue = (value: number) => MethodDecoratorFactory(
  (cd: ClassData, method: MethodData, desc: any) => {
    method.tags['MethodReturnValue'] = value;
  }
);
```

Define the argument value override decorator
```typescript
// Method decorator used to 'inject' and override an argument
class ArgValue {
   public idx: number;
   public value: any;
   constructor(data: Required<ArgValue>) { Object.assign(this, data); }
}
const MethodArgValue = (idx: number, value: any) => MethodDecoratorFactory(
  (cd: ClassData, method: MethodData, desc: any) => {
    const data = (method.tags['MethodArgValue'] || []);
    data.push(new ArgValue({ idx, value }));
    method.tags['MethodArgValue'] = data;
  }
);
```

Finally decorate the class

```typescript
@MyClassDecorator('name', 'CustomName')
class DecoratedClass {
   // @MethodReturnValue(100)
   @MethodCacheResult(3)
   @MethodArgValue(0, 'Hello World')
   public DecoratedMethod(arg1: string, arg2: number): string {
      return arg1 + ' - ' + arg2;
   }
}

const classData = ReflectHelper.getClass(DecoratedClass);
classData.buildMethodParameters();
console.log(classData.methods);
```

Simple example on how to use the data we aquired (not too many sanity checks)
```typescript
function execute(targetClass: Function, targetMethod: string, args: any[]): any {
   // Get the class data
   const cd = ReflectHelper.getClass(targetClass);
   // Get the method data from the class
   const md = cd.methods.find(m => m.name === targetMethod);
   // Check to see if we have caching and if the cache is still 'fresh'
   const cache = md.getAttributesOfType<CacheData>(CacheData)[0];
   if (cache && cache.lastUpdate && (cache.lastUpdate + cache.ttl) > Date.now()) {
      // We still have a valid cache
      return cache.value;
   }
   // Create the arguments to be sent to the method
   const argOverride = (md.tags['MethodArgValue'] || []);
   for (const aOv of argOverride) {
      if (aOv.idx > args.length) {
         continue;
      }
      if (aOv.idx === args.length) {
         args.push(aOv.value);
         continue;
      }
      args[aOv.idx] = aOv.value;
   }
   // Call the function after we create an instance of the class
   const instance = Reflect.construct(cd.target, []);
   const result = instance[md.name].apply(instance, args);

   // Get the return value override if any
   const returnValueOverride = md.tags['MethodReturnValue'];
   // Update the cache if needed
   if (cache) {
      cache.lastUpdate = Date.now();
      cache.value = returnValueOverride ? returnValueOverride : result;
   }

   // Finally perform the return
   return returnValueOverride ? returnValueOverride : result;
}


// This should log 'Hello World - 1' until the cache expires and then it should log 'Hello World - 33'
//    The first argument is overridden so it will never be 'MyName' or 'YourName'
const originalResult = execute(DecoratedClass, 'DecoratedMethod', ['MyName', 1]);
let result: string = null;
do {
   result = execute(DecoratedClass, 'DecoratedMethod', ['YourName', 33])
   console.log(result);
} while (originalResult === result);
```
