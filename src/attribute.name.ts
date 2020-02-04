import {
  AnyDecorator,
  AnyDecoratorFactory,
  ClassData,
  DecoratorType,
  GetDecoratorType,
  kReflectNameKey,
  MethodData,
  ParameterData,
  PropertyData
} from './reflection';

export function Name(name: string): AnyDecorator {
  return AnyDecoratorFactory((classData: ClassData, arg1?: MethodData | PropertyData, arg2?: ParameterData | any) => {
    switch (GetDecoratorType(classData, arg1, arg2)) {
      case DecoratorType.Class:
        classData.tags[kReflectNameKey] = name;
        break;
      case DecoratorType.Method:
        arg1.tags[kReflectNameKey] = name;
        break;
      case DecoratorType.Parameter:
        arg2.tags[kReflectNameKey] = name;
        break;
      case DecoratorType.Property:
        arg1.tags[kReflectNameKey] = name;
        break;
      default:
        break;
    }
  });
}
