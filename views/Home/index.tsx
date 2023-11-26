import { Banner, Button, Form, Space, Spin, Toast } from "@douyinfe/semi-ui";
import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./index.module.css";
import { useTranslation } from "next-i18next";
import { BsSdk } from "@/libs/bs-sdk/BsSdk";
import BProvide from "@/libs/bs-sdk/components/b-provide";
import { BsORM } from "@/libs/bs-sdk/BsORM";
import BSelectField from "@/libs/bs-sdk/components/b-select-field";
import Section from "@douyinfe/semi-ui/lib/es/form/section";
import ECharts from "@/components/echarts";
import {
  base64ToFile,
  downloadFile,
  fileToIOpenAttachment,
} from "@/libs/bs-sdk/shared";
import { FieldType } from "@lark-base-open/js-sdk";

const bsSdk = new BsSdk({
  onSelectionChange: true,
  immediatelySelectionChange: true,
});

const orm = new BsORM(bsSdk);

export default function Home() {
  const [t] = useTranslation();
  const [option, setOption] = useState<any>(
    createOption({
      A: 10,
      B: 10,
      C: 10,
    })
  );
  const echartRef = useRef();
  const [conf, setConf] = useState<any>({ output: { type: "preview" } });

  useEffect(() => {
    const clear = bsSdk.selectionChangeEmitter.on(async (e) => {
      const { record, field } = await bsSdk.getSelectionQuery(e.data);
      console.log("record", record);
      console.log("field", field);
      console.log(e);
    });
    return clear;
  });

  const onSubmit = useCallback(async (conf: any) => {
    console.log(
      conf,
      echartRef
      // downloadFile(base64ToFile(url, Date.now() + ".png", "image/png"))
    );
    if (Object.keys(conf.select).length === 0) return Toast.error("请选择字段");
    let load = Toast.info({
      icon: <Spin />,
      content: "生成中...",
      duration: 0,
    });
    let recordId = "";
    if (conf.output.type !== "multiToField") {
      const select = await bsSdk.getSelection();
      console.log({ select });

      recordId = select.recordId as string;
    }
    console.log({ recordId });

    if (conf.output.type === "multiToField") {
      const recordIds = await bsSdk.getRecordIds();
      if (!recordIds.length) return Toast.error("出现错误");
      for (let i = 0; i < recordIds.length; i++) {
        Toast.close(load);
        load = Toast.info({
          icon: <Spin />,
          content: `生成中(${i + 1}/${recordIds.length})...`,
          duration: 0,
        });
        const recordId = recordIds[i];
        const url = await gene(recordId);
        if (!url) continue;
        const outfield = orm.getFieldsMap().get(conf.output.field);
        if ((await outfield?.getType()) !== FieldType.Attachment) {
          Toast.close(load);
          return Toast.error("请选择附件字段");
        }
        outfield?.setValue(recordId, [
          await fileToIOpenAttachment(
            bsSdk.base,
            base64ToFile(url, Date.now() + ".png", "image/png")
          ),
        ]);
      }
    } else {
      if (!recordId) {
        Toast.close(load);
        return Toast.error("请选择记录");
      }

      const url = await gene(recordId);

      const outfield = orm.getFieldsMap().get(conf.output.field);
      if ((await outfield?.getType()) !== FieldType.Attachment) {
        Toast.close(load);
        return Toast.error("请选择附件字段");
      }
      outfield?.setValue(recordId, [
        await fileToIOpenAttachment(
          bsSdk.base,
          base64ToFile(url, Date.now() + ".png", "image/png")
        ),
      ]);
    }
    Toast.close(load);
    Toast.success("生成成功");

    async function gene(recordId: string) {
      const record = await orm.getRecord(recordId);
      const selectFieldRecord = conf.select.reduce(
        (map: any, fieldId: string) => {
          if (record[fieldId] !== null) {
            map[orm.getFieldsMap()?.get(fieldId)?.name as string] =
              record[fieldId];
          }
          return map;
        },
        {}
      );

      if (Object.keys(selectFieldRecord).length === 0) {
        return;
      }

      setOption(createOption(selectFieldRecord));
      console.log(record, selectFieldRecord);

      await new Promise((resolve) => setTimeout(resolve, 1));
      const url = (echartRef.current as any)?.getDataURL();
      return url;
    }
  }, []);

  const onChange = useCallback((e: any) => {
    setConf({ ...e.values });
  }, []);

  return (
    <main className={styles.main}>
      <BProvide
        orm={orm}
        formProps={{
          onSubmit,
          onChange,
          labelPosition: "left",
          initValues: conf,
        }}
      >
        <Section text={"字段配置"} style={{ marginTop: "10px" }}>
          <BSelectField
            field="select"
            label="选择字段"
            placeholder="选择字段"
            multiple
          ></BSelectField>
          {/* <BSelectField
            field="select[1]"
            label="选择字段"
            placeholder="选择字段"
          ></BSelectField>
          <BSelectField
            field="select[2]"
            label="选择字段"
            placeholder="选择字段"
          ></BSelectField>
          <BSelectField
            field="select[3]"
            label="选择字段"
            placeholder="选择字段"
          ></BSelectField>
          <BSelectField
            field="select[4]"
            label="选择字段"
            placeholder="选择字段"
          ></BSelectField> */}
        </Section>
        <Section text={"输出配置"} style={{ marginTop: "10px" }}>
          <Form.Select field="output.type" label="输出方式">
            <Form.Select.Option value={"preview"}>预览</Form.Select.Option>
            <Form.Select.Option value={"toField"}>生成到列</Form.Select.Option>
            <Form.Select.Option value={"multiToField"}>
              批量生成到列
            </Form.Select.Option>
          </Form.Select>
          {conf?.output && conf?.output?.type !== "preview" && (
            <>
              <BSelectField
                field="output.field"
                label="输出字段"
                placeholder="只支持附件字段"
              ></BSelectField>
              <Banner
                type="danger"
                description="注意：生成会直接覆盖指定字段内容"
                style={{ marginBottom: "10px" }}
              />
            </>
          )}
        </Section>
        <Space>
          <Button htmlType="submit" block type="primary">
            生成
          </Button>
        </Space>
        <div style={{ width: "100%", height: "400px" }}>
          <ECharts refInstance={echartRef} option={option}></ECharts>
        </div>
      </BProvide>
    </main>
  );
}

function createOption(params: any) {
  const keys = Object.keys(params);
  return {
    // title: {
    //   text: "Basic Radar Chart",
    // },
    legend: {
      data: ["Allocated Budget", "Actual Spending"],
    },
    radar: {
      // shape: 'circle',
      // indicator: [
      //   { name: "Sales" },
      //   { name: "Administration" },
      //   { name: "Information Technology" },
      //   { name: "Customer Support" },
      //   { name: "Development" },
      //   { name: "Marketing" },
      // ],
      indicator: keys.map((key) => ({ name: key })),
    },
    series: [
      {
        name: "Budget vs spending",
        type: "radar",
        data: [
          {
            value: keys.map((key) => params[key]),
            // name: "Allocated Budget",
          },
          // {
          //   value: [4200, 3000, 20000, 35000, 50000, 18000],
          //   name: "Allocated Budget",
          // },
          // {
          //   value: [5000, 14000, 28000, 26000, 42000, 21000],
          //   name: "Actual Spending",
          // },
        ],
      },
    ],
  };
}
