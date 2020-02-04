/* eslint-disable @typescript-eslint/no-empty-function */
import { isFunction, isNil } from '../utils';
import {
  ClassData,
  MethodData,
  MethodFlags,
  ParameterData,
  PropertyData,
  PropertyFlags,
  ReflectHelper
} from './reflection';

export class DynamicProperty {
  constructor(public classData: ClassData, public prop: PropertyData) {}
  public decorate(callback: PropertyDecorator): DynamicProperty {
    callback(this.classData.target.prototype, this.prop.name);
    return this;
  }
  public setValue(val: any): DynamicProperty {
    Object.defineProperty(this.classData.target.prototype, this.prop.name, {
      writable: true,
      enumerable: true,
      configurable: true,
      value: val
    });
    return this;
  }
}

export class DynamicParameter {
  constructor(public classData: ClassData, public method: MethodData, public param: ParameterData) {}
  public decorate(callback: ParameterDecorator): DynamicParameter {
    callback(this.classData.target.prototype, this.method.name, this.param.idx);
    return this;
  }
}

export class DynamicMethod {
  private _paramsCount: number;
  constructor(public classData: ClassData, public method: MethodData) {
    this._paramsCount = 0;
  }

  public addParameter(
    callback?: (arg: DynamicParameter) => void,
    idx?: number,
    type: Function = Object
  ): DynamicMethod {
    let parameterIdx = idx;
    if (isNil(parameterIdx)) {
      parameterIdx = this._paramsCount++;
    }
    const paramData: ParameterData = this.method.getOrCreateParameter(parameterIdx);
    if (isFunction(callback)) {
      callback(new DynamicParameter(this.classData, this.method, paramData));
    }
    if (!isNil(type)) {
      paramData.target = type;
    }
    return this;
  }

  public addBody(callback: (...args: any[]) => any): DynamicMethod {
    this.classData.target.prototype[this.method.name] = callback;
    return this;
  }

  public decorate(callback: MethodDecorator): DynamicMethod {
    callback(this.classData.target.prototype, this.method.name, null);
    return this;
  }
}

export class DynamicClass {
  constructor(public classData: ClassData) {}
  public addMethod(name: string, callback?: (dm: DynamicMethod) => void): DynamicClass {
    const method = this.classData.getOrCreateMethod(name);
    method.flags = MethodFlags.INSTANCE;
    if (isFunction(callback)) {
      callback(new DynamicMethod(this.classData, method));
    }
    if (isNil(this.classData.target.prototype[name])) {
      // Default body
      this.classData.target.prototype[name] = (): void => {};
    }
    return this;
  }
  public addProperty(name: string, callback?: (dp: DynamicProperty) => void): DynamicClass {
    const propData = this.classData.getOrCreateProperty(name);
    propData.flags = PropertyFlags.INSTANCE;
    if (isFunction(callback)) {
      callback(new DynamicProperty(this.classData, propData));
    }
    return this;
  }
  public decorate(callback: ClassDecorator): DynamicClass {
    callback(this.classData.target);
    return this;
  }
}

export class Dynamic {
  public static createClass(
    name: string,
    inherits: Function | null,
    callback?: (_class: DynamicClass) => void
  ): ClassData {
    let dynamicClass: Function = null;
    if (!isNil(inherits)) {
      dynamicClass = eval(`(function() { return class ${name} extends ${inherits.name} {}; })()`);
    } else {
      dynamicClass = eval(`(function() { return class ${name} {}; })()`);
    }

    let classData = ReflectHelper.getClass(dynamicClass);
    if (!isNil(classData)) {
      throw new Error(`Cannot create dynamic class '${name}' since it is already registered.`);
    }
    // Create the class Data
    classData = ReflectHelper.getOrCreateClassData(dynamicClass);

    if (isFunction(callback)) {
      callback(new DynamicClass(classData));
    }
    (classData as any)._infoBuilt = true;
    return classData;
  }
}
