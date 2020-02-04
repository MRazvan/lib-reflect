/* eslint-disable @typescript-eslint/ban-types */
import { isNumber } from 'util';
import { isNil } from '../utils';
import { ClassData, MethodData, ParameterData, PropertyData, ReflectHelper } from './reflection';

export declare type ClassDecoratorCallback = (classData: ClassData) => void;
export declare type MethodDecoratorCallback = <T>(
  classData: ClassData,
  methodData: MethodData,
  descriptor: TypedPropertyDescriptor<T>
) => void;
export declare type PropertyDecoratorCallback = (classData: ClassData, property: PropertyData) => void;

export declare type ParameterDecoratorCallback = (
  classData: ClassData,
  methodData: MethodData,
  paramData: ParameterData
) => void;

export declare type NoArgument = (classData: ClassData) => void;
export declare type OneArgument = (classData: ClassData, arg1?: MethodData | PropertyData) => void;
export declare type TwoArgument = (
  classData: ClassData,
  arg1?: MethodData | PropertyData,
  arg2?: ParameterData | any
) => void;

export declare type AnyDecoratorCallback = NoArgument | OneArgument | TwoArgument;
export declare type AnyDecorator = ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator;

export enum DecoratorType {
  Class,
  Method,
  Property,
  Parameter
}

export function GetDecoratorType(
  cd: ClassData,
  arg1?: MethodData | PropertyData,
  arg2?: ParameterData | any
): DecoratorType {
  if (isNil(arg2)) {
    // We could have arg1
    if (isNil(arg1)) {
      // we don't - class decorator
      return DecoratorType.Class;
    }
    // arg2 still nill and we have a second argument - PropertyDecorator
    return DecoratorType.Property;
  }
  if (arg2 instanceof ParameterData) {
    // parameter decorator
    return DecoratorType.Parameter;
  }
  // method decorator
  return DecoratorType.Method;
}

export function AnyDecoratorFactory(callback: AnyDecoratorCallback): AnyDecorator {
  return (target: Object | Function, arg1?: string | undefined, arg2?: number | any): void => {
    const targetFunction = typeof target === 'function' ? target : target.constructor;
    const cd = ReflectHelper.getOrCreateClassData(targetFunction);
    /* We can encounter the following cases: <class, string | undefined, descriptor | number | undefined>
    - 1 : <class, undefined, undefined>           -> Class decorator
    - 2 : <class, string | undefined, descriptor> 
    -    2.1   <class, undefined, descriptor>     -> Constructor decorator
    -    2.2   <class, string, descriptor>        -> Method decorator
    - 3 : <class, string, undefined>              -> Property decorator
    - 4 : <class, string, number>                 -> Parameter decorator
    */
    if (isNil(arg1)) {
      // The 'method' or 'property' is not defined
      //    The only place we we can have <class, undefined, descriptor> is on constructor
      //    so we check to see if we are in that case
      if (isNil(arg2)) {
        // 1:
        // Class decorator
        callback(ReflectHelper.getOrCreateClassData(targetFunction));
      } else {
        // 2.1:
        // When decorating a constructor, the method is undefined
        callback(cd, cd.getConstructorData(), arg2);
      }
    } else if (isNil(arg2)) {
      // 3:
      // We have a property decorator
      callback(cd, cd.getOrCreateProperty(arg1));
    } else if (isNumber(arg2)) {
      // 4:
      // We have a parameter decoration
      const method = cd.getOrCreateMethod(arg1);
      callback(cd, method, method.getOrCreateParameter(arg2));
    } else if (!isNil(arg1)) {
      // 2.2
      // A method decorator
      callback(cd, cd.getOrCreateMethod(arg1), arg2);
    }
  };
}

export function ClassDecoratorFactory(callback: ClassDecoratorCallback): ClassDecorator {
  return (target: Function): void => {
    callback(ReflectHelper.getOrCreateClassData(target));
  };
}

export function PropertyDecoratorFactory(callback: PropertyDecoratorCallback): PropertyDecorator {
  return (target: Object, propertyKey: string): void => {
    const cd = ReflectHelper.getOrCreateClassData(target.constructor);
    const prop = cd.getOrCreateProperty(propertyKey);
    callback(cd, prop);
  };
}

export function ParameterDecoratorFactory(callback: ParameterDecoratorCallback): ParameterDecorator {
  return (target: Object, propertyKey: string, parameterIndex: number): void => {
    const cd = ReflectHelper.getOrCreateClassData(isNil(propertyKey) ? (target as Function) : target.constructor);
    const method = cd.getOrCreateMethod(propertyKey);
    const param = method.getOrCreateParameter(parameterIndex);
    callback(cd, method, param);
  };
}

export function MethodDecoratorFactory(callback: MethodDecoratorCallback): MethodDecorator {
  return <T>(target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<T>): void => {
    const cd = ReflectHelper.getOrCreateClassData(target.constructor);
    const method = cd.getOrCreateMethod(propertyKey);
    callback(cd, method, descriptor);
  };
}
