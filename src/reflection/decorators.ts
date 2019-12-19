/* eslint-disable @typescript-eslint/ban-types */
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

export function AnyDecoratorFactory(callback: AnyDecoratorCallback): AnyDecorator {
  return (
    target: Object | Function,
    arg1?: MethodData | PropertyData | undefined,
    arg2?: ParameterData | any
  ): void => {
    const targetFunction = typeof target === 'function' ? target : target.constructor;
    callback(ReflectHelper.getOrCreateClassData(targetFunction), arg1, arg2);
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
    const cd = ReflectHelper.getOrCreateClassData(target.constructor);
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
