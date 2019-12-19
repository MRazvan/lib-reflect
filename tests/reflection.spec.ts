// eslint-disable-next-line
/// <reference path="../src/defines.d.ts" />
import { expect } from "chai";
import { ClassData, ClassDecoratorFactory, MethodDecoratorFactory, ParameterDecoratorFactory, PropertyDecoratorFactory, ReflectHelper } from "../index";
import { MethodData, ParameterData, PropertyData } from "../src/reflection";

const ClassAttr = () => ClassDecoratorFactory((classData: ClassData) => { });
@ClassAttr()
class ClassTest { }

const MethodAttr = () => MethodDecoratorFactory(<T>(classData: ClassData, method: MethodData, d: TypedPropertyDescriptor<T>) => { });
class MethodTest {
   @MethodAttr()
   public method() { }
}

const ParamAttr = () => ParameterDecoratorFactory((classData: ClassData, method: MethodData, p: ParameterData) => {
});
class ParamTest {
   public method(@ParamAttr() p: string) { }
}
class ParamTestTyped {
   public method(@ParamAttr() p: string, s: string) { }
}


const PropertyAttr = () => PropertyDecoratorFactory((cd: ClassData, prop: PropertyData) => { });
class PropertyTest {
   @PropertyAttr()
   public name: string;
}

class PropertyTestDescending extends PropertyTest {
   @PropertyAttr()
   public username: string;
}

describe('ReflectHelper', () => {
   it('Should have class metadata if class is decorated.', () => {
      const cdata = ReflectHelper.getClass(ClassTest);
      expect(cdata).not.to.be.null;
      expect(cdata.name).to.be.string('ClassTest');
      expect(cdata.target).to.be.eq(ClassTest);
   });

   it('Should have class metadata if method is decorated.', () => {
      const cdata = ReflectHelper.getClass(MethodTest);
      expect(cdata).not.to.be.null;
      expect(cdata.name).to.be.string('MethodTest');
      expect(cdata.target).to.be.eq(MethodTest);
   });

   it('ClassData should have method metadata if method is decorated.', () => {
      const cdata = ReflectHelper.getClass(MethodTest);
      expect(cdata.methods).to.have.length(1);
      const method = cdata.methods[0];
      expect(method).not.to.be.null;
      expect(method.name).to.be.eq('method');
   });

   it('MethodData should have argument metadata if argument is decorated.', () => {
      const cdata = ReflectHelper.getClass(ParamTest);
      expect(cdata.methods[0].parameters).to.have.length(1);
      const argument = cdata.methods[0].parameters[0];
      expect(argument).not.to.be.null;
      expect(argument.idx).to.be.eq(0);
   });

   it('MethodData should have argument metadata if argument is not decorated.', () => {
      const cdata = ReflectHelper.getClass(ParamTestTyped);
      cdata.build();

      expect(cdata.methods[0].parameters).to.have.length(2);
      const argument = cdata.methods[0].parameters[1];
      expect(argument).not.to.be.null;
      expect(argument.idx).to.be.eq(1);
      expect(argument.target.name).to.be.eq('String');
   });

   it('ClassData should have property metadata if property is decorated.', () => {
      const cdata = ReflectHelper.getClass(PropertyTest);
      expect(cdata.properties).to.have.length(1);
      const property = cdata.properties[0];
      expect(property).not.to.be.null;
      expect(property.name).to.be.eq('name');
   });

   it('ClassData child should not inherit parent data.', () => {
      const cdata = ReflectHelper.getClass(PropertyTestDescending);
      expect(cdata.properties).to.have.length(1);
      const property = cdata.properties[0];
      expect(property).not.to.be.null;
      expect(property.name).to.be.eq('username');
   });

   it('ClassData parent should not inherit child data.', () => {
      const cdata = ReflectHelper.getClass(PropertyTest);
      expect(cdata.properties).to.have.length(1);
      const property = cdata.properties[0];
      expect(property).not.to.be.null;
      expect(property.name).to.be.eq('name');
   });

   it('Should return class metadata for all parents', () => {
      const cdata = ReflectHelper.getClassWithParentsIncluded(PropertyTestDescending);
      expect(cdata).to.have.length(2);
      const firstData = cdata[0];
      expect(firstData).not.to.be.undefined;
      expect(firstData).not.to.be.null;
      expect(firstData.name).to.eq('PropertyTestDescending');
      expect(firstData.properties).to.have.length(1);
      let property = firstData.properties[0];
      expect(property.name).to.be.eq('username');

      const secondData = cdata[1];
      expect(secondData).not.to.be.undefined;
      expect(secondData).not.to.be.null;
      expect(secondData.name).to.eq('PropertyTest');
      expect(secondData.properties).to.have.length(1);
      property = secondData.properties[0];
      expect(property.name).to.be.eq('name');
   });

   it('Should populate class information without property.', () => {

      class TestClass {
         public testMethod() { }
         public testProp: string;
      }
      const cdata = ReflectHelper.getOrCreateClassData(TestClass);
      cdata.build();
      expect(cdata).not.to.be.undefined;
      expect(cdata).not.to.be.null;
      expect(cdata.name).to.eq('TestClass');
      expect(cdata.properties).to.have.length(0);
      expect(cdata.methods).to.have.length(1);
      const method = cdata.methods[0];
      expect(method.name).to.be.eq('testMethod');
   });

   it('Should populate class information with property.', () => {

      class TestClass {
         public testMethod() { }
         public get testProp() { return ''; }
      }
      const cdata = ReflectHelper.getOrCreateClassData(TestClass);
      cdata.build();
      expect(cdata).not.to.be.undefined;
      expect(cdata).not.to.be.null;
      expect(cdata.name).to.eq('TestClass');
      expect(cdata.properties).to.have.length(1);
      const property = cdata.properties[0];
      expect(property.name).to.be.eq('testProp');
      expect(cdata.methods).to.have.length(1);
      const method = cdata.methods[0];
      expect(method.name).to.be.eq('testMethod');
   });

   it('Should populate property type information from reflect-metadata.', () => {
      const dec = (): PropertyDecorator => PropertyDecoratorFactory((cd, pd) => { });
      class TestClass {
         public testMethod() { }
         @dec()
         public test: string;
      }
      const cdata = ReflectHelper.getOrCreateClassData(TestClass);
      cdata.build();
      expect(cdata).not.to.be.undefined;
      expect(cdata).not.to.be.null;
      expect(cdata.properties[0].type).to.eq(String);
   });

   it('Should not populate property type information from reflect-metadata if it already has it.', () => {
      const dec = (): PropertyDecorator => PropertyDecoratorFactory((cd, pd) => {
         pd.type = Number;
      });
      class TestClass {
         public testMethod() { }
         @dec()
         public test: string;
      }
      const cdata = ReflectHelper.getOrCreateClassData(TestClass);
      cdata.build();
      expect(cdata).not.to.be.undefined;
      expect(cdata).not.to.be.null;
      expect(cdata.properties[0].type).to.eq(Number);
   });
});