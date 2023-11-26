import { useContext } from "react";
import { Context } from "../b-provide";
import { Form, Select } from "@douyinfe/semi-ui";
import { SelectProps } from "@douyinfe/semi-ui/lib/es/select";

export type BSelectFieldProps = SelectProps & { field: string; label?: string };

export default function BSelectField(props: BSelectFieldProps) {
  const ctx = useContext(Context);
  return (
    <Form.Select {...props}>
      {ctx.orm?.getFields().map((field) => (
        <Form.Select.Option key={field.id} value={field.id}>
          {field.name}
        </Form.Select.Option>
      ))}
    </Form.Select>
  );
}
