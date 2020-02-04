# lib-reflect
<p align="center">
<img src="https://github.com/MRazvan/lib-reflect/workflows/build/badge.svg">
<img src="https://coveralls.io/repos/github/MRazvan/lib-reflect/badge.svg?branch=master">
<img src="https://img.shields.io/github/package-json/v/MRazvan/lib-reflect?style=flat-square">
<img src="https://img.shields.io/github/license/MRazvan/lib-reflect?style=flat-square">
</p>

Opinionated project for helping with Reflection and Decorators in typescript. 
It tries to simplify storing data on the reflected target without using reflect-metadata and simplifies creation of decorators.

- [lib-reflect](#lib-reflect)
  - [Installation](#installation)
  - [Reflection](#reflection)
      - [ClassData](#classdata)
      - [PropertyData](#propertydata)
      - [MethodData](#methoddata)
      - [ParameterData](#parameterdata)
  - [Decorators](#decorators)
    - [ClassDecoratorFactory](#classdecoratorfactory)
    - [PropertyDecoratorFactory](#propertydecoratorfactory)
    - [MethodDecoratorFactory](#methoddecoratorfactory)
    - [ParameterDecoratorFactory](#parameterdecoratorfactory)
    - [AnyDecoratorFactory](#anydecoratorfactory)
  - [Reflect Hooks](#reflect-hooks)
  - [Dynamic](#dynamic)
  - [Example](#example)
      - [Example using Reflection and Decorators](#example-using-reflection-and-decorators)
## Installation
Standard npm package install
```
npm i lib-reflect
```

## Reflection
The reflection system is made, so it's easy to use without working
with the reflect-metadata system directly. 
It works in conjuction with the decorator helpers bellow.
```typescript
class MyTestClass{}
const myTestData: ClassData = ReflectHelper.getOrCreateClassData(MyTestClass);
console.log(myTestData);
```
The ReflectHelper class has the following methods to help with retrieving / creating class reflection information.

> Before using the ClassData we need to call **build** on it so it can gather extra information from the generated decorators (like the return type for the method, or extra parameters not decorated by us);
```typescript
const cd = ReflectHelper.getClass(<someClass>);
cd.build();
// Now we have all the information including extra information added by the generated decorators
```

```typescript
class TestClass {}

// Will retrieve if it exists or create the class data reflection info object for that class
const cd: ClassData = ReflectHelper.getOrCreateClassData(TestClass);
// Will retrieve the reflection info object for the class if it exists, if not it will return null
const cd: ClassData = ReflectHelper.getClass(TestClass);
// Will retrieve reflection info objects for the class and all the parents if they have any reflection data
//    The data order will be from derived to base (TestClassData, ParentData, ParentParentData ....)
const cd: ClassData[] = ReflectHelper.getClassWithParentsIncluded(TestClass);
```

The following classes are available and contain reflection information:

#### ClassData
Contains information about the reflected class it is created / retrieved using the ReflectHelper methods:
```typescript
class ClassData {
  // Name of the class
  public name: string;
  // The constructor function
  public target: Function;
  // Attributes applied to the class
  public attributesData: AttributeData[];
  // Methods
  public methods: MethodData[];
  // Properties
  public properties: PropertyData[];
  // Extra data attached to the class
  public tags: { [key: string]: any };
}
```
In order to get / create the reflected data on a method we can use the following function:
```typescript
  const methodData: MethodData = classData.getOrCreateMethod(methodName);
```
In order to get / create the reflected data on a property we can use the following function:
```typescript
  const propertyData: PropertyData = classData.getOrCreateProperty(propertyName);
```
In order to get the constructor method info:
```typescript
  const constructorData: MethodData = classData.getConstructorData();
```
#### PropertyData
Contains information about the reflected property:
```typescript

enum PropertyFlags {
  INSTANCE,
  STATIC
}

class PropertyData {
  // Name of the property
  public name: string;
  // Attributes for the property
  public attributesData: AttributeData[];
  // The data type of the property
  public type: Function;
  // Tags attached to this property by various decorators if needed
  public tags: { [key: string]: any };
  // Flags for the property
  public flags: PropertyFlags;
  // The parent class
  public parent: ClassData;  
}
```

#### MethodData
Contains information about the reflected method:
```typescript
enum MethodFlags {
  INSTANCE,
  STATIC,
  CONSTRUCTOR
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
  public processed: boolean;
  // Tags attached to this method by various decorators if needed
  public tags: { [key: string]: any };
  // The return type of the function as taken from typescript
  public returnType: Function;
  // Flags for the method
  public flags: MethodFlags;
  // The parent class
  public parent: ClassData;  
}
```
In order to get / create a new parameter reflection data we can use the following function:
```typescript
  const paramData: ParameterData = methodData.getOrCreateParameter(paramIdx);
```

#### ParameterData
Contains information about the reflected parameter:
```typescript
class ParameterData {
  // The index of the parameter
  public idx: number;
  // The type of the parameter
  public target: Function;
  // Custom attribute data that decorators can add
  public attributesData: AttributeData[];
  // Tags attached to this parameter by various modules if needed
  public tags: { [key: string]: any };
  // The name of the parameter
  // In theory we might be able to get the parameter name for the method
  //    it's not an orthodox method, however it is beeing used by other libraries like 'angularjs'
  // I would suggest not to rely on this field
  // Also for constructor functions this is not available
  public name: string;  
  // The parent method
  public parent: MethodData;  
}
```

## Decorators
Expose utility functions that use the Reflection system to ease the creation and management of decorators and decorator data.

One of the problem with decorators is that a method / property decorator is called before the class decorator. Using the functions bellow it does not matter what is called when, the implementation will take care of creating what is needed and sending the data to the handler.
The decorate call order will still be the same, however the class data will exist in all handlers regardless of the order.

The following helper methods are available:
### ClassDecoratorFactory
It accepts a callback that takes the [ClassData](#classdata) as argument, you can modify the reflection information inside that callback.
```typescript
// Example of a Class Decorator created using the ClassDecoratorFactory
const classDecorator = (val:number): ClassDecorator => ClassDecoratorFactory(
  (cd: ClassData) => {
    cd.tags['MyCustomReflectionValue'] = val;
    // Manipulate the class reflection data if needed
  }
);
```
### PropertyDecoratorFactory
It accepts a callback that takes the [ClassData](#classdata) and the [PropertyData](#propertydata) as arguments, you can modify the reflection information inside that callback.

```typescript
// Example of a Property Decorator created using the PropertyDecoratorFactory
const propertyDecorator = (val:number): PropertyDecorator => PropertyDecoratorFactory(
  (cd: ClassData, prop:PropertyData) => {
    // Manipulate the class / property reflection data if needed
    prop.tags['MyCustomPropertyValue'] = val;
  }
);
```
### MethodDecoratorFactory
It accepts a callback that takes the [ClassData](#classdata), [MethodData](#methodata) and the property descriptor as arguments, you can modify the reflection information inside that callback.

```typescript
// Example of a Method Decorator created using the MethodDecoratorFactory
const methodDecorator = (val:number): MethodDecorator => MethodDecoratorFactory(
  (cd: ClassData, md:MethodData, descr: any) => {
    // Manipulate the class / method reflection data if needed
    md.tags['MethodCacheTimeout'] = val;
  }
);
```
### ParameterDecoratorFactory
It accepts a callback that takes the [ClassData](#classdata), [MethodData](#methodata) and the [ParameterData](#parameterdata) as arguments, you can modify the reflection information inside that callback.

```typescript
// Example of a Argument Decorator created using the ParameterDecoratorFactory
const parameterDecorator = (): ParameterDecorator => ParameterDecoratorFactory(
  (cd: ClassData, md:MethodData, param: ParameterData) => {
    // Manipulate the class / method / argument reflection data if needed
  }
);
```
### AnyDecoratorFactory
It accepts a callback that takes a combination of all the above as arguments, you can modify the reflection information inside that callback.
It can be applied on anything (class, method, properties, parameters)
```typescript
// Example of a Decorator that can be used to decorate anything created using the AnyDecoratorFactory
const anyDecorator = (): AnyDecorator => AnyDecoratorFactory(
  (cd: ClassData, arg1: MethodData | PropertyData | undefined, arg2: ParameterData | any) => {
    // Manipulate the class / property / method / argument reflection data if needed
  }
);
```

## Reflect Hooks
Allow hooks to be added to the decorator / reflection system to intercept various points in the flow of creating reflection information. Adding hooks is done by calling **addHook** on the ReflectHelper class.
This can be usefull for example to keep track of all classes that have decorators by intercepting class reflection info creation.

```typescript
ReflectHelper.addHook(hook : Partial<IReflectionHook>);
```
```typescript
interface IReflectionHook {
  // Called after the class data has been created
  onCreateClass(cd: ClassData): void;
  // Called once the class has been augmented with information from typescript / javascript reflection
  onProcessedClass(cd: ClassData): void;
  // Called once a method reflection information is created
  onCreateMethod(cd: ClassData, md: MethodData): void;
  // Called once a method is processed as part of the class augmentation process, after this
  // - The method should have return types
  // - The parameters should have names
  // - Any parameter not decorated should have the target associated
  // - The method flag should be valid
  onProcessedMethod(cd: ClassData, md: MethodData): void;
  // Called once a property reflection information is created
  onCreateProperty(cd: ClassData, pd: PropertyData): void;
  // Called once a parameter reflection information is created
  onCreateParameter(cd: ClassData, md: MethodData, pd: ParameterData): void;
}
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

For a complex example including [lib-intercept](https://github.com/MRazvan/lib-intercept) go to [lib-intercept-example](https://github.com/MRazvan/lib-intercept-example)

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
classData.build();
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
