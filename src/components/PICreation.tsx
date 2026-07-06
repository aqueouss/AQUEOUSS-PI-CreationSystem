import React, { useState } from "react";
import { 
  Form, 
  Input, 
  InputNumber, 
  Checkbox, 
  Button, 
  Table, 
  Card, 
  Row, 
  Col, 
  Divider, 
  Space, 
  Modal, 
  App,
  Popconfirm,
  Switch,
  Select
} from "antd";
import { PlusOutlined, DeleteOutlined, FileSearchOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { generatePI } from "../api";
import { User, PICreationInput, PIPreviewData, InvoiceNotes } from "../types";
import { PIPreview } from "./PIPreview";

interface PICreationProps {
  currentUser: User;
  onGenerationSuccess: () => void;
}

export const PICreation: React.FC<PICreationProps> = ({ currentUser, onGenerationSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<PIPreviewData | null>(null);
  const [wasGenerated, setWasGenerated] = useState(false);
  const notesEnabled = Form.useWatch(["invoiceNotes", "enabled"], form);

  // States to keep track of live calculations
  const [, setRefreshVal] = useState(0);

  // Calculation values
  const getTotals = (formValues: any) => {
    const productsList = formValues?.products || [];
    const chargesList = formValues?.additionalCharges || [];
    
    let subtotal = 0;
    productsList.forEach((p: any) => {
      const qty = Number(p?.quantity) || 0;
      const rate = Number(p?.rate) || 0;
      subtotal += qty * rate;
    });

    // Taxable amount is the subtotal of products (GST is ONLY calculated on products)
    const taxableAmount = subtotal; 
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const isDelhi = formValues?.isDelhiNcr || false;
    if (isDelhi) {
      cgst = taxableAmount * 0.09;
      sgst = taxableAmount * 0.09;
    } else {
      igst = taxableAmount * 0.18;
    }

    const gstAmount = cgst + sgst + igst;

    let totalCharges = 0;
    chargesList.forEach((c: any) => {
      totalCharges += Number(c?.amount) || 0;
    });

    const grandTotal = taxableAmount + gstAmount + totalCharges;

    return {
      subtotal,
      taxable: taxableAmount,
      cgst,
      sgst,
      igst,
      gst: gstAmount,
      totalCharges,
      grand: grandTotal
    };
  };

  // Trigger preview
  const buildPreviewData = (values: Record<string, unknown>): PIPreviewData => {
    const calculatedTotals = getTotals(values);
    const notes = values.invoiceNotes as InvoiceNotes | undefined;
    const invoiceNotes =
      notes?.enabled && notes.description?.trim()
        ? { enabled: true, title: notes.title, description: notes.description.trim() }
        : undefined;

    return {
      ...(values as Omit<PIPreviewData, "totals" | "invoiceNotes">),
      invoiceNotes,
      totals: calculatedTotals
    };
  };

  const handlePreview = () => {
    form.validateFields()
      .then((values) => {
        setPreviewData(buildPreviewData(values));
        setWasGenerated(false);
        setPreviewVisible(true);
      })
      .catch(() => {
        message.error("Please fill in all required fields before previewing.");
      });
  };

  // Submit and generate PI number + log to sheet
  const handleGenerate = () => {
    form.validateFields()
      .then(async (values) => {
        setLoading(true);
        try {
          const calculatedTotals = getTotals(values);
          const input: PICreationInput = {
            customerName: values.customerName,
            address: values.address,
            mobile: values.mobile,
            gstin: values.gstin || "",
            state: values.state,
            isDelhiNcr: values.isDelhiNcr,
            additionalCharges: values.additionalCharges || [],
            products: values.products
          };

          const response = await generatePI(input, calculatedTotals, currentUser.name);
          
          message.success(`PI generated successfully! Serial: ${response.piNumber}`);
          
          // Render preview/download of the final document
          setPreviewData({
            ...buildPreviewData(values),
            piNumber: response.piNumber,
            date: new Date().toISOString().split("T")[0]
          });
          setWasGenerated(true);
          setPreviewVisible(true);
          
          // Clear form and reset state
          form.resetFields();
          form.setFieldsValue({ 
            products: [{ productName: "", hsnCode: "", quantity: 1, unit: "Pcs", rate: 0 }],
            additionalCharges: [],
            piSharedBy: currentUser.name,
            invoiceNotes: { enabled: false, title: "Important Notes", description: "" }
          });
        } catch (err: any) {
          message.error(err.message || "Failed to generate Proforma Invoice");
        } finally {
          setLoading(false);
        }
      })
      .catch(() => {
        message.error("Please fill in all required fields.");
      });
  };

  return (
    <div className="fade-in-entry">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
          Create Proforma Invoice
        </h2>
        <p style={{ color: "var(--text-secondary-light)", margin: 0 }}>
          Fill in customer details, add products, and generate a certified PI.
        </p>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          products: [{ productName: "", hsnCode: "", quantity: 1, unit: "Pcs", rate: 0 }],
          isDelhiNcr: false,
          additionalCharges: [],
          piSharedBy: currentUser.name,
          invoiceNotes: { enabled: false, title: "Important Notes", description: "" }
        }}
        onValuesChange={() => {
          // Trigger recalculations on value changes
          setRefreshVal(prev => prev + 1);
        }}
      >
        <Row gutter={24}>
          {/* Form Panel */}
          <Col xs={24} lg={16}>
            <Card title="Customer Information" bordered={false} className="glass-card" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="customerName"
                    label="Customer Name"
                    rules={[{ required: true, message: "Customer name is required" }]}
                  >
                    <Input placeholder="Enter Customer / Company Name" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="mobile"
                    label="Mobile Number"
                    rules={[
                      { required: true, message: "Mobile number is required" },
                      { pattern: /^[0-9+ ]{10,13}$/, message: "Please enter a valid mobile number" }
                    ]}
                  >
                    <Input placeholder="Enter Mobile Number" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="gstin"
                    label="GSTIN"
                    rules={[
                      { pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, message: "Enter valid GSTIN format (e.g. 07AAAAA1111A1Z1)" }
                    ]}
                  >
                    <Input placeholder="Optional GST Number" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="state"
                    label="State"
                    rules={[{ required: true, message: "State is required" }]}
                  >
                    <Input placeholder="e.g. Delhi, Maharashtra" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="address"
                label="Full Address"
                rules={[{ required: true, message: "Customer address is required" }]}
              >
                <Input.TextArea rows={3} placeholder="Billing and Shipping Address" />
              </Form.Item>

              <Form.Item name="isDelhiNcr" valuePropName="checked">
                <Checkbox>
                  <strong>Delhi / NCR Region Customer</strong> (Applies CGST 9% + SGST 9%, otherwise IGST 18%)
                </Checkbox>
              </Form.Item>
            </Card>

            <Card title="Invoice Details" bordered={false} className="glass-card" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="dispatchDate"
                    label="Dispatch Date"
                  >
                    <Input type="date" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="piSharedBy"
                    label="PI Shared By"
                  >
                    <Input placeholder="Enter name of person sharing PI" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Product Details" bordered={false} className="glass-card" style={{ marginBottom: 24 }}>
              <Form.List name="products">
                {(fields, { add, remove }) => (
                  <>
                    <Table
                      dataSource={fields}
                      columns={[
                        {
                          title: "Product Details",
                          render: (_, field) => (
                            <Row gutter={12}>
                              <Col xs={24} md={12}>
                                <Form.Item
                                  name={[field.name, "productName"]}
                                  rules={[{ required: true, message: "Required" }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder="Product Name" />
                                </Form.Item>
                              </Col>
                              <Col xs={12} md={6}>
                                <Form.Item
                                  name={[field.name, "hsnCode"]}
                                  rules={[{ required: false, message: "Optional" }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder="HSN Code" />
                                </Form.Item>
                              </Col>
                              <Col xs={12} md={6}>
                                <Form.Item
                                  name={[field.name, "unit"]}
                                  initialValue="Pcs"
                                  rules={[{ required: false, message: "Optional" }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input placeholder="Unit" />
                                </Form.Item>
                              </Col>
                            </Row>
                          )
                        },
                        {
                          title: "Qty & Rate",
                          width: 200,
                          render: (_, field) => (
                            <Row gutter={8}>
                              <Col span={10}>
                                <Form.Item
                                  name={[field.name, "quantity"]}
                                  rules={[{ required: true, message: "Required" }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber min={1} style={{ width: "100%" }} placeholder="Qty" />
                                </Form.Item>
                              </Col>
                              <Col span={14}>
                                <Form.Item
                                  name={[field.name, "rate"]}
                                  rules={[{ required: true, message: "Required" }]}
                                  style={{ marginBottom: 0 }}
                                >
                                  <InputNumber min={0} style={{ width: "100%" }} placeholder="Rate" />
                                </Form.Item>
                              </Col>
                            </Row>
                          )
                        },
                        {
                          title: "Action",
                          width: 60,
                          align: "center" as const,
                          render: (_, field) => (
                            <Button 
                              type="text" 
                              danger 
                              icon={<DeleteOutlined />} 
                              onClick={() => remove(field.name)} 
                              disabled={fields.length === 1}
                            />
                          )
                        }
                      ]}
                      pagination={false}
                      rowKey="key"
                      bordered
                      style={{ marginBottom: 16 }}
                    />
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Product
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Card title="Additional Charges" bordered={false} className="glass-card" style={{ marginBottom: 24 }}>
              <Form.List name="additionalCharges">
                {(fields, { add, remove }) => (
                  <>
                    <Table
                      dataSource={fields}
                      columns={[
                        {
                          title: "Charges Description",
                          render: (_, field) => (
                            <Form.Item
                              name={[field.name, "desc"]}
                              rules={[{ required: true, message: "Required" }]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="e.g. Freight Charges, Packaging, COD Charges" />
                            </Form.Item>
                          )
                        },
                        {
                          title: "Amount (₹)",
                          width: 200,
                          render: (_, field) => (
                            <Form.Item
                              name={[field.name, "amount"]}
                              rules={[{ required: true, message: "Required" }]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber min={0} style={{ width: "100%" }} placeholder="Amount" />
                            </Form.Item>
                          )
                        },
                        {
                          title: "Action",
                          width: 60,
                          align: "center" as const,
                          render: (_, field) => (
                            <Button 
                              type="text" 
                              danger 
                              icon={<DeleteOutlined />} 
                              onClick={() => remove(field.name)} 
                            />
                          )
                        }
                      ]}
                      pagination={false}
                      rowKey="key"
                      bordered
                      style={{ marginBottom: 16 }}
                    />
                    <Button type="dashed" onClick={() => add({ desc: "", amount: 0 })} block icon={<PlusOutlined />}>
                      Add Additional Charge
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Card title="Notes / Terms (Optional)" bordered={false} className="glass-card" style={{ marginBottom: 24 }}>
              <Form.Item
                name={["invoiceNotes", "enabled"]}
                label="Add Important Notes or Terms & Conditions"
                valuePropName="checked"
              >
                <Switch checkedChildren="On" unCheckedChildren="Off" />
              </Form.Item>

              {notesEnabled && (
                <>
                  <Form.Item
                    name={["invoiceNotes", "title"]}
                    label="Section Title"
                    rules={[{ required: true, message: "Please select a section title" }]}
                  >
                    <Select
                      options={[
                        { value: "Important Notes", label: "Important Notes" },
                        { value: "Terms and Conditions", label: "Terms and Conditions" }
                      ]}
                    />
                  </Form.Item>

                  <Form.Item
                    name={["invoiceNotes", "description"]}
                    label="Description"
                    extra="Enter each point on a new line. They will appear as bullet points on the invoice."
                    rules={[
                      { required: true, message: "Please enter at least one note or term" },
                      {
                        validator: (_, value) =>
                          value?.trim()
                            ? Promise.resolve()
                            : Promise.reject(new Error("Please enter at least one note or term"))
                      }
                    ]}
                  >
                    <Input.TextArea
                      rows={5}
                      placeholder={"Example:\nPayment due within 7 days\nGoods once sold will not be taken back\nDelivery within 15 working days"}
                    />
                  </Form.Item>
                </>
              )}
            </Card>
          </Col>

          {/* Right Summary Panel */}
          <Col xs={24} lg={8}>
            <Card 
              title="Invoice Summary" 
              bordered={false} 
              className="glass-card" 
              style={{ position: "sticky", top: 24 }}
            >
              <div style={{ fontSize: "0.95rem" }}>
                {/* Dynamically calculate preview */}
                {(() => {
                  const values = form.getFieldsValue();
                  const totals = getTotals(values);
                  const chargesList = values?.additionalCharges || [];
                  const isDelhiNcrVal = values?.isDelhiNcr || false;
                  return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ color: "var(--text-secondary-light)" }}>Subtotal (Products)</span>
                        <span>₹{totals.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <strong>Taxable Value</strong>
                        <strong>₹{totals.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                      </div>

                      {isDelhiNcrVal ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, paddingLeft: 12 }}>
                            <span style={{ color: "var(--text-secondary-light)", fontSize: "0.85rem" }}>CGST (9%)</span>
                            <span style={{ fontSize: "0.85rem" }}>₹{totals.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingLeft: 12 }}>
                            <span style={{ color: "var(--text-secondary-light)", fontSize: "0.85rem" }}>SGST (9%)</span>
                            <span style={{ fontSize: "0.85rem" }}>₹{totals.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, paddingLeft: 12 }}>
                          <span style={{ color: "var(--text-secondary-light)", fontSize: "0.85rem" }}>IGST (18%)</span>
                          <span style={{ fontSize: "0.85rem" }}>₹{totals.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <span style={{ color: "var(--text-secondary-light)" }}>Total GST</span>
                        <span>₹{totals.gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>

                      {chargesList.length > 0 && (
                        <>
                          <Divider style={{ margin: "8px 0" }} />
                          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.85rem", color: "var(--text-secondary-light)" }}>Additional Charges (Untaxed)</div>
                          {chargesList.map((c: any, index: number) => {
                            if (!c || !c.desc) return null;
                            return (
                              <div key={index} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, paddingLeft: 12, fontSize: "0.85rem" }}>
                                <span>{c.desc}</span>
                                <span>₹{(Number(c.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                              </div>
                            );
                          })}
                        </>
                      )}

                      <Divider style={{ margin: "12px 0" }} />

                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, fontSize: "1.2rem", fontWeight: 700 }}>
                        <span style={{ color: "var(--primary-hover)" }}>Grand Total</span>
                        <span style={{ color: "var(--primary-hover)" }}>₹{totals.grand.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  );
                })()}

                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  <Button 
                    block 
                    icon={<FileSearchOutlined />} 
                    onClick={handlePreview}
                  >
                    Preview PI Template
                  </Button>

                  <Popconfirm
                    title="Generate Proforma Invoice"
                    description="This will lock and increment the serial sequence and record details on Google Sheets. Proceed?"
                    onConfirm={handleGenerate}
                    okText="Generate"
                    cancelText="Cancel"
                  >
                    <Button 
                      type="primary" 
                      block 
                      size="large" 
                      icon={<CheckCircleOutlined />} 
                      loading={loading}
                      className="btn-primary-grad"
                    >
                      Generate PI
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>
      </Form>

      {/* PI Preview Dialog */}
      <Modal
        open={previewVisible}
        onCancel={() => {
          setPreviewVisible(false);
          setPreviewData(null);
          if (wasGenerated) {
            setWasGenerated(false);
            onGenerationSuccess();
          }
        }}
        destroyOnClose={true}
        footer={null}
        width={900}
        style={{ top: 20 }}
      >
        {previewData && (
          <PIPreview 
            data={previewData} 
            onClose={() => {
              setPreviewVisible(false);
              setPreviewData(null);
              if (wasGenerated) {
                setWasGenerated(false);
                onGenerationSuccess();
              }
            }}
          />
        )}
      </Modal>
    </div>
  );
};
