/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable guard-for-in */

import { isFunction, isNil } from '../utils';
import { kReflectHooksKey, kReflectKey } from './constants';
import { getMethodParameterNames } from './internals/function.param.names';

export class AttributeData {}

// Lame way to check, however in nodejs there is an issue with module resolution
//    not working correctly when using instanceOf, if we find a better way we should replace this
// There is a problem with classes using the same name, comming from different modules
//    those will resolve true.
export function checkIfInstanceOf(whatToCheck: Function, targetToCheck: Function): boolean {
  const name = isFunction(whatToCheck) ? whatToCheck.name : whatToCheck.constructor.name;
  if (name === targetToCheck.name) {
    return true;
  }
  if (!isNil(whatToCheck.__proto__)) {
    return checkIfInstanceOf(whatToCheck.__proto__, targetToCheck);
  }
  return false;
}

export enum MethodFlags {
  INSTANCE,
  STATIC,
  CONSTRUCTOR
}

export enum PropertyFlags {
  INSTANCE,
  STATIC
}

export class PropertyData {
  // Name of the property
  public name: string;
  // Attributes for the property
  public attributesData: AttributeData[];
  // The data type of the property
  public type: Function;
  // Extra data attached to the class
  public tags: { [key: string]: any };
  // Flags for the property
  public flags: PropertyFlags;
  // The parent class
  public parent: ClassData;

  public getAttributesOfType<T extends AttributeData>(targetType: Function): T[] {
    return this.attributesData.filter((inst: AttributeData) => checkIfInstanceOf(inst.constructor, targetType)) as T[];
  }
}

export class ParameterData {
  // The index of the parameter
  public idx: number;
  // The type of the parameter
  public type: Function;
  // Custom attribute data that decorators can add
  public attributesData: AttributeData[];
  // Extra data attached to the class
  public tags: { [key: string]: any };
  // The name of the parameter
  // In theory we might be able to get the parameter name for the method
  //    it's not an orthodox method, however it is beeing used by other libraries like 'angularjs'
  // I would suggest not to rely on this field
  // Also for constructor functions this is not available
  public name: string;
  // The parent method
  public parent: MethodData;

  public getAttributesOfType<T extends AttributeData>(targetType: Function): T[] {
    return this.attributesData.filter((inst: AttributeData) => checkIfInstanceOf(inst.constructor, targetType)) as T[];
  }
}

export class MethodData {
  // Name of the method to invoke on the controller
  public name: string;
  // The options applied on the method
  public attributesData: AttributeData[];
  // The parameters needed to the handler method
  public parameters: ParameterData[];
  // Extra data attached to the class
  public tags: { [key: string]: any };
  // The return type of the function as taken from typescript
  public returnType: Function;
  // Flags for the method
  public flags: MethodFlags;
  // The parent class
  public parent: ClassData;

  public getOrCreateParameter(idx: number): ParameterData {
    let param = this.parameters.find((param: ParameterData) => param.idx === idx);
    if (isNil(param)) {
      param = new ParameterData();
      param.idx = idx;
      param.attributesData = [];
      param.tags = {};
      param.parent = this;
      ReflectHelperHooks.invokeHook(h => h.onCreateParameter, this.parent, this, param);
      this.parameters.push(param);
    }
    return param;
  }

  public getAttributesOfType<T extends AttributeData>(targetType: Function): T[] {
    return this.attributesData.filter((inst: AttributeData) => checkIfInstanceOf(inst.constructor, targetType)) as T[];
  }
}

export class ClassData {
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

  // Flag to indicate if the reflection information was build for the class
  private _infoBuilt = false;

  public getConstructorData(): MethodData {
    return this.getOrCreateMethod(null);
  }

  public getOrCreateMethod(method: string): MethodData {
    if (isNil(method)) {
      method = 'constructor';
    }

    let data = this.methods.find((m: MethodData) => m.name === method);
    if (isNil(data)) {
      data = new MethodData();
      data.name = method;
      data.attributesData = [];
      data.parameters = [];
      data.tags = {};
      data.parent = this;
      data.flags = !isNil(this.target.prototype[method]) ? MethodFlags.INSTANCE : MethodFlags.STATIC;
      if (method === 'constructor') {
        data.flags = MethodFlags.CONSTRUCTOR;
      }
      ReflectHelperHooks.invokeHook(h => h.onCreateMethod, this, data);
      this.methods.push(data);
    }
    return data;
  }

  public getOrCreateProperty(propKey: string): PropertyData {
    let data = this.properties.find((m: PropertyData) => m.name === propKey);
    if (isNil(data)) {
      data = new PropertyData();
      data.name = propKey;
      data.attributesData = [];
      data.type = null;
      data.tags = {};
      data.parent = this;
      data.flags = !isNil((this.target as any)[propKey]) ? PropertyFlags.STATIC : PropertyFlags.INSTANCE;
      ReflectHelperHooks.invokeHook(h => h.onCreateProperty, this, data);
      this.properties.push(data);
    }
    return data;
  }

  public getAttributesOfType<T extends AttributeData>(targetType: Function): T[] {
    return this.attributesData.filter((inst: AttributeData) => checkIfInstanceOf(inst.constructor, targetType)) as T[];
  }

  // Improve the information we have on the reflected parameters with information from reflect-metadata if needed.
  public build(): void {
    if (this._infoBuilt) {
      return;
    }

    ClassData._prepopulateReflection(this);
    // We must go through each method and rebuild the parameters list based on the arguments it gets
    for (let methodIdx = 0; methodIdx < this.methods.length; ++methodIdx) {
      const method = this.methods[methodIdx];
      const argsCount = ClassData._getMethodArgumentsCount(this, method);
      if (argsCount > 0) {
        // Get the reflected parameters from typescript and merge them with parameters from reflection
        const reflectedParamTypes: Function[] = ClassData._getMethodParamTypes(this, method);
        // Augment parameters with typescript info if available
        for (let paramIdx = 0; paramIdx < reflectedParamTypes.length; ++paramIdx) {
          const paramData: ParameterData = method.getOrCreateParameter(paramIdx);
          paramData.target = paramData.target || reflectedParamTypes[paramIdx];
        }

        // We have extra parameters, or the methods / parameters are not decorated
        if (method.parameters.length !== argsCount) {
          // We might have a method that is not decorated so create the parameters by hand
          for (let idx = 0; idx < Math.max(method.parameters.length, argsCount); ++idx) {
            method.getOrCreateParameter(idx);
          }
        }

        // Now that we have processed parameters get the name of them
        if (method.flags !== MethodFlags.CONSTRUCTOR) {
          const paramNames = ClassData._getMethodArgumentsName(this, method);
          paramNames.forEach((param: string, idx: number) => {
            method.getOrCreateParameter(idx).name = param;
          });
          // Return type
          method.returnType = method.returnType || ClassData._getMethodReturnType(this, method);
        }
      }

      ReflectHelperHooks.invokeHook(h => h.onProcessedMethod, this, method);
    }

    // Go through the properties and check if we have any information on them
    for (let propertyIdx = 0; propertyIdx < this.properties.length; ++propertyIdx) {
      const prop = this.properties[propertyIdx];
      if (!isNil(prop.type)) {
        continue;
      }
      const reflectedProp: Function = Reflect.getMetadata(
        'design:type',
        prop.flags === PropertyFlags.INSTANCE ? this.target.prototype : this.target,
        prop.name
      );
      if (!isNil(reflectedProp)) {
        prop.type = prop.type || reflectedProp;
      }
    }
    ReflectHelperHooks.invokeHook(h => h.onProcessedClass, this);
    this._infoBuilt = true;
  }

  private static _getMethodReturnType(cd: ClassData, method: MethodData): Function {
    return Reflect.getMetadata(
      'design:returntype',
      method.flags === MethodFlags.INSTANCE ? cd.target.prototype : cd.target,
      method.name
    );
  }

  private static _getMethodParamTypes(cd: ClassData, method: MethodData): Function[] {
    return (
      (method.flags === MethodFlags.CONSTRUCTOR
        ? Reflect.getMetadata('design:paramtypes', cd.target)
        : method.flags === MethodFlags.INSTANCE
        ? Reflect.getMetadata('design:paramtypes', cd.target.prototype, method.name)
        : Reflect.getMetadata('design:paramtypes', cd.target, method.name)) || []
    );
  }

  private static _getMethodArgumentsCount(cd: ClassData, method: MethodData): number {
    const canAugment =
      method.flags === MethodFlags.CONSTRUCTOR ||
      !isNil(cd.target.prototype[method.name]) ||
      !isNil((cd.target as any)[method.name]);
    if (!canAugment) {
      return -1;
    }

    return method.flags === MethodFlags.CONSTRUCTOR
      ? cd.target.prototype.constructor.length
      : method.flags === MethodFlags.INSTANCE
      ? cd.target.prototype[method.name].length
      : (cd.target as any)[method.name].length;
  }

  private static _getMethodArgumentsName(cd: ClassData, method: MethodData): string[] {
    return getMethodParameterNames(
      method.flags === MethodFlags.INSTANCE ? cd.target.prototype[method.name] : (cd.target as any)[method.name]
    );
  }

  private static _prepopulateReflection(cd: ClassData): void {
    const filteredProperties = ['length', 'name', 'prototype', 'constructor'];
    // Get all properties / methods from the class and add them to the class data
    let propDescriptions = Object.getOwnPropertyDescriptors(cd.target.prototype);
    for (const propKey in propDescriptions) {
      if (filteredProperties.includes(propKey)) {
        continue;
      }

      const propDescriptor = propDescriptions[propKey];
      if (isNil(propDescriptor.get) && isNil(propDescriptor.set)) {
        if (isFunction(propDescriptor.value)) {
          // Assume it's a method
          cd.getOrCreateMethod(propKey);
        }
      } else {
        // Assume it's a property
        cd.getOrCreateProperty(propKey);
      }
    }

    // Go through static functions and gather those
    propDescriptions = Object.getOwnPropertyDescriptors(cd.target);
    for (const propKey in propDescriptions) {
      if (filteredProperties.includes(propKey)) {
        continue;
      }
      const propDescriptor = propDescriptions[propKey];
      if (isNil(propDescriptor.get) && isNil(propDescriptor.set)) {
        if (isFunction(propDescriptor.value)) {
          // Assume it's a method
          const md = cd.getOrCreateMethod(propKey);
          md.flags = MethodFlags.STATIC;
        } else {
          const prop = cd.getOrCreateProperty(propKey);
          prop.flags = PropertyFlags.STATIC;
        }
      } else {
        // Assume it's a property
        const prop = cd.getOrCreateProperty(propKey);
        prop.flags = PropertyFlags.STATIC;
      }
    }
  }
}

export interface IReflectionHook {
  // Called after the class data has been created
  onCreateClass(cd: ClassData): void;
  // Called after a decorator is applied
  onDecoratedClass(cd: ClassData): void;
  // Called once the class has been augmented with information from typescript / javascript reflection
  onProcessedClass(cd: ClassData): void;
  // Called once a method reflection information is created
  onCreateMethod(cd: ClassData, md: MethodData): void;
  // Called after a decorator is applied
  onDecoratedMethod(cd: ClassData, md: MethodData): void;
  // Called once a method is processed as part of the class augmentation process, after this
  // - The method should have return types
  // - The parameters should have names
  // - Any parameter not decorated should have the target associated
  // - The method flag should be valid
  onProcessedMethod(cd: ClassData, md: MethodData): void;
  // Called once a property reflection information is created
  onCreateProperty(cd: ClassData, pd: PropertyData): void;
  // Called after a decorator is applied
  onDecoratedProperty(cd: ClassData, pd: PropertyData): void;
  // Called once a parameter reflection information is created
  onCreateParameter(cd: ClassData, md: MethodData, pd: ParameterData): void;
  // Called after a decorator is applied
  onDecoratedParameter(cd: ClassData, md: MethodData, pd: ParameterData): void;
}

export class ReflectHelper {
  public static addHook(hook: Partial<IReflectionHook>): void {
    if (isNil(hook)) {
      throw new Error('ReflectHelper.addHook: Invalid hook (null or undefined)');
    }
    const hooks = (Reflect.getMetadata(kReflectHooksKey, ReflectHelper) as Partial<IReflectionHook>[]) || [];
    hooks.push(hook);
    Reflect.defineMetadata(kReflectHooksKey, hooks, ReflectHelper);
  }

  public static getClassWithParentsIncluded(target: Function): ClassData[] {
    const result = [(Reflect.getOwnMetadata(kReflectKey, target) as ClassData) || null];
    let current: Function = target;
    let lastFoundIdx = -1;
    while (!isNil(current.__proto__)) {
      const currentData = Reflect.getOwnMetadata(kReflectKey, current.__proto__) as ClassData;
      // Keep track of the last one not null
      if (!isNil(currentData)) {
        lastFoundIdx = result.length;
      }
      result.push(currentData || null);
      current = current.__proto__;
    }
    if (lastFoundIdx === -1) {
      return [];
    }
    // Return the data up to the last one not null
    //    This allows the following [null, ClassData]
    // Meaning the child has a parent with class data,
    //  the child has nothing
    return result.slice(0, lastFoundIdx + 1);
  }

  public static getClass(target: Function): ClassData {
    return Reflect.getOwnMetadata(kReflectKey, target);
  }

  public static getOrCreateClassData(target: Function): ClassData {
    const processedTarget = target.prototype ? target : target.constructor;
    let found: ClassData = Reflect.getOwnMetadata(kReflectKey, processedTarget);
    if (isNil(found)) {
      found = new ClassData();
      found.name = processedTarget.name;
      found.target = processedTarget;
      found.attributesData = [];
      found.methods = [];
      found.tags = {};
      found.properties = [];
      found.getConstructorData().returnType = processedTarget;
      Reflect.defineMetadata(kReflectKey, found, processedTarget);
      ReflectHelperHooks.invokeHook(h => h.onCreateClass, found);
    }
    return found;
  }
}

export class ReflectHelperHooks {
  private static _getHooks(): IReflectionHook[] {
    return (Reflect.getMetadata(kReflectHooksKey, ReflectHelper) as IReflectionHook[]) || [];
  }

  public static invokeHook(target: (h: IReflectionHook) => Function, ...args: any[]): void {
    const hooks = ReflectHelperHooks._getHooks();
    for (const hook of hooks) {
      const hookTargetFunction = target(hook);
      if (isFunction(hookTargetFunction)) {
        hookTargetFunction.call(hook, ...args);
      }
    }
  }
}
