// eslint-disable-next-line
/// <reference path="../src/defines.d.ts" />
import { expect } from "chai";
import { ClassData, ClassDecoratorFactory, MethodDecoratorFactory, ParameterDecoratorFactory } from "../index";
import { Dynamic, DynamicClass, DynamicMethod, DynamicParameter, DynamicProperty, MethodData, ParameterData, PropertyData, PropertyDecoratorFactory } from "../src/reflection";

const MyClassDecorator = (): ClassDecorator => ClassDecoratorFactory((cd: ClassData) => { cd.tags['dec'] = true; });
const MyPropDecorator = () => PropertyDecoratorFactory((cd: ClassData, prop: PropertyData) => { prop.tags['dec'] = true; });
const MyMethodDecorator = () => MethodDecoratorFactory((cd: ClassData, md: MethodData, descr: any) => { md.tags['dec'] = true; });
const MyParamDecorator = () => ParameterDecoratorFactory((cd: ClassData, md: MethodData, p: ParameterData) => {
   p.tags['dec'] = true;
});

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
         return null;
      });
      // Set the method body
      //    WARNING: Be carefull of using lambda here, you must understand the context of 'this'
      dm.addBody(function (arg1, arg2) { return arg1 + arg2; });
   });
   dc.addMethod('sayHello', (dm: DynamicMethod) => {
      dm.addBody(function () { return 'Hello ' + this.name; });
   })
   dc.addProperty('name', (dp: DynamicProperty) => {
      dp.decorate(MyPropDecorator());
      dp.setValue('TestName');
   });
});

describe('Dynamic', () => {
   it('Should create classData.', () => {
      expect(classData).to.exist;
      expect(classData.target).to.exist;
      expect(classData.name).to.eq('MyCustomDynamicClass');
   })

   it('Should apply decorators to class.', () => {
      expect(classData.tags['dec']).to.be.true;
   })

   it('Should create methods on the class.', () => {
      expect(classData.methods.length).to.eq(2);
      expect(classData.methods[0].name).to.eq('dynamicMethod');
   })

   it('Should apply decorators to methods.', () => {
      expect(classData.methods[0].tags['dec']).to.be.true;
   })

   it('Should add arguments to methods.', () => {
      const method = classData.methods[0];
      expect(method.parameters.length).to.eq(2);
   })

   it('Should add decorators to method parameters.', () => {
      const method = classData.methods[0];
      expect(method.parameters[1].tags['dec']).to.be.true;
   })

   it('Should add properties.', () => {
      expect(classData.properties.length).to.eq(1);
      expect(classData.properties[0].name).to.eq('name');
   })

   it('Should add decorators to properties.', () => {
      expect(classData.properties[0].tags['dec']).to.be.true;
   })

   it('Should create class that can be instantiated', () => {
      const inst = Reflect.construct(classData.target, []);
      expect(inst).to.not.be.null;
   })

   it('Should add a method body to the method', () => {
      const inst = Reflect.construct(classData.target, []);
      const result = inst.dynamicMethod(1, 2);
      expect(result).to.eq(3);
   })

   it('Should set a valid "this" context on the method body', () => {
      const inst = Reflect.construct(classData.target, []);
      let result = inst.sayHello();
      expect(result).to.eq('Hello TestName');
   })
});