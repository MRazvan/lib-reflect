import { isFunction, isNil } from '../utils';
import { kReflectKey } from './constants';
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

export class PropertyData {
  // Name of the property
  public name: string;
  // Attributes for the property
  public attributesData: AttributeData[];
  // The data type of the property
  public type: Function;
  // Extra data attached to the class
  public tags: { [key: string]: any };

  public getAttributesOfType<T extends AttributeData>(targetType: Function): T[] {
    return this.attributesData.filter((inst: AttributeData) => checkIfInstanceOf(inst.constructor, targetType)) as T[];
  }
}

export class ParameterData {
  // The index of the parameter
  public idx: number;
  // The type of the parameter
  public target: Function;
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
  // Flag indicating if this method has been processed or not
  //    We don't always decorate the parameters, the reflection system will try and get
  //    additional information from the typescript system, in order to do this we need to 'process'
  //    the method, this flag is indicating if the process has happened or not
  public processed = false;
  // Extra data attached to the class
  public tags: { [key: string]: any };
  // The return type of the function as taken from typescript
  public returnType: Function;

  public getOrCreateParameter(idx: number): ParameterData {
    let param = this.parameters.find((param: ParameterData) => param.idx === idx);
    if (isNil(param)) {
      param = new ParameterData();
      param.idx = idx;
      param.attributesData = [];
      param.tags = {};
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
      if (method.processed) {
        continue;
      }
      // Get the reflected parameters from typescript and merge them with parameters from reflection
      const reflectedParams: Function[] =
        (method.name === 'constructor'
          ? Reflect.getMetadata('design:paramtypes', this.target)
          : Reflect.getMetadata('design:paramtypes', this.target.prototype, method.name)) || [];

      for (let paramIdx = 0; paramIdx < reflectedParams.length; ++paramIdx) {
        // Force a parameter creation so if it does not exist, we created it now
        const methodParam: ParameterData = method.getOrCreateParameter(paramIdx);
        methodParam.target = methodParam.target || reflectedParams[paramIdx];
      }

      // This is here in case we don't have the method / parameters decorated, in that case
      //    The decorator system would not work, so generate parameters based on javascript functionality
      const targetParamsCount =
        method.name === 'constructor'
          ? this.target.prototype.constructor.length
          : this.target.prototype[method.name].length;
      if (method.parameters.length === 0 && targetParamsCount !== 0) {
        // We might have a method that is not decorated so create the parameters by hand
        const paramsCount = targetParamsCount;
        for (let idx = 0; idx < paramsCount; ++idx) {
          method.getOrCreateParameter(idx);
        }
      }

      // Now that we have processed parameters get the name of them
      if (method.name !== 'constructor') {
        const paramNames = getMethodParameterNames(this.target.prototype[method.name]);
        paramNames.forEach((param: string, idx: number) => {
          const paramData = method.getOrCreateParameter(idx);
          paramData.name = param;
        });
      }

      method.returnType =
        method.returnType || Reflect.getMetadata('design:returntype', this.target.prototype, method.name);
      method.processed = true;
    }

    // Go through the properties and check if we have any information on them
    for (let propertyIdx = 0; propertyIdx < this.properties.length; ++propertyIdx) {
      const prop = this.properties[propertyIdx];
      if (!isNil(prop.type)) {
        continue;
      }
      const reflectedParam: Function = Reflect.getMetadata('design:type', this.target.prototype, prop.name);
      if (!isNil(reflectedParam)) {
        prop.type = prop.type || reflectedParam;
      }
    }
    this._infoBuilt = true;
  }

  private static _prepopulateReflection(cd: ClassData): void {
    // Get all properties / methods from the class and add them to the class data
    const propDescriptions = Object.getOwnPropertyDescriptors(cd.target.prototype);
    for (const propKey in propDescriptions) {
      if (propKey === 'constructor') continue;

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
  }
}

export class ReflectHelper {
  public static getClassWithParentsIncluded(target: Function): ClassData[] {
    const result = [Reflect.getMetadata(Symbol.keyFor(kReflectKey), target) as ClassData];
    let current: Function = target;
    while (!isNil(current.__proto__)) {
      const currentData = Reflect.getMetadata(Symbol.keyFor(kReflectKey), current.__proto__) as ClassData;
      if (isNil(currentData)) {
        break;
      }
      result.push(currentData);
      current = current.__proto__;
    }
    return result;
  }

  public static getClass(target: Function): ClassData {
    return Reflect.getOwnMetadata(Symbol.keyFor(kReflectKey), target);
  }

  public static getOrCreateClassData(target: Function): ClassData {
    let found: ClassData = Reflect.getOwnMetadata(Symbol.keyFor(kReflectKey), target);
    if (isNil(found)) {
      found = new ClassData();
      found.name = target.name;
      found.target = target;
      found.attributesData = [];
      found.methods = [];
      found.tags = {};
      found.properties = [];
      found.getConstructorData().returnType = target;
      Reflect.defineMetadata(Symbol.keyFor(kReflectKey), found, target);
    }
    return found;
  }
}
