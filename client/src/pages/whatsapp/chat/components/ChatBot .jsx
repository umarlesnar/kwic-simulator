import { useState, useRef, useEffect } from "react";
import { BiCheckDouble, BiCheck } from "react-icons/bi";
import { TbClockShare } from "react-icons/tb";
import { VscLoading } from "react-icons/vsc";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  IoCloseCircleOutline,
  IoCopyOutline,
  IoDocumentTextOutline,
} from "react-icons/io5";
import { AiOutlineDelete } from "react-icons/ai";
import { MdDownload } from "react-icons/md";
import { TiArrowBack } from "react-icons/ti";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import {
  Cog6ToothIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  MoonIcon,
  SunIcon,
  PaperClipIcon,
  ArrowDownTrayIcon,
  ShoppingCartIcon,
  ArrowPathIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import WBMessages from "@utils/WBMessages";
import { WebhookService } from "@api/WebhookService";
import { RxImage } from "react-icons/rx";
import { HiOutlineMusicNote, HiOutlineVideoCamera } from "react-icons/hi";
import { GrLocation } from "react-icons/gr";
import { FaRegUser } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { businessService } from "@api/businessService";
import WbMessageStatus from "@utils/WBMessageStatus";
import { toast } from "react-toastify";

// Utility function to format seconds as mm:ss
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};

// Transform API message to component format
const transformMessage = (apiMessage, phoneNumberId) => {
  const messageType = apiMessage.type || apiMessage.message?.type || "text";
  const isUser =
    apiMessage.direction === "incoming" || apiMessage.io_type === "INCOMMING";

  let content = "";
  let additionalData = {};

  // Handle different message types
  switch (messageType) {
    case "text":
      content =
        apiMessage.message?.text?.body ||
        apiMessage.text?.body ||
        apiMessage.message ||
        "";
      break;

    case "template":
      const template = apiMessage.message?.template;
      if (template) {
        content = {
          title: template.name || "Template Message",
          body:
            template.components?.find((c) => c.type === "BODY")?.text || template.components?.[0]?.text ||
            "Template content",
          button:
            template.components?.find((c) => c.type === "BUTTONS")?.buttons?.[0]
              ?.text || "View Details",
          link: "#",
          templateName: template.name,
          bodyVariables: template.body_variables || {},
        };
        additionalData.templateId = apiMessage.template_id;
        additionalData.templateData = template;
      } else {
        content = "Template message";
      }
      break;

    case "interactive":
      const interactive = apiMessage.message?.interactive;
      if (interactive) {
        if (interactive.type === "order_details") {
          const orderData = interactive.action?.parameters?.order;
          content = {
            title: "Order Details",
            orderId: interactive.action?.parameters?.reference_id || "N/A",
            date: new Date(apiMessage.timestamp).toLocaleDateString(),
            items: orderData?.items || [],
            subtotal: orderData?.subtotal || { value: 0 },
            total: interactive.action?.parameters?.total_amount || { value: 0 },
            currency: interactive.action?.parameters?.currency || "INR",
            status: orderData?.status || "pending",
            expiration: orderData?.expiration,
          };
        } else {
          content = {
            title: interactive.body?.text || "Interactive Message",
            options:
              interactive.action?.buttons?.map((btn) => ({
                label: btn.reply?.title || btn.title,
                value: btn.reply?.payload || btn.id,
              })) || [],
          };
        }
        additionalData.interactiveData = interactive;
      } else {
        content = "Interactive message";
      }
      break;

    case "order":
      const order = apiMessage.message?.order;
      if (order) {
        content = {
          orderId: `#${apiMessage.cart_id || "ORD" + Date.now()}`,
          date: new Date(apiMessage.timestamp).toLocaleDateString(),
          items:
            order.product_items?.map((item) => ({
              name: item.name || `Product ${item.product_retailer_id}`,
              qty: item.quantity || 1,
              price: item.item_price || 0,
              currency: item.currency || "INR",
              image: item.image_url,
              productId: item.product_retailer_id,
              productId2: item.product_id,
            })) || [],
          total:
            order.product_items?.reduce(
              (sum, item) =>
                sum + (item.item_price || 0) * (item.quantity || 1),
              0
            ) || 0,
          currency: order.product_items?.[0]?.currency || "INR",
          catalogId: order.catalog_id,
          text: order.text || "Order with items",
        };
        additionalData.cartId = apiMessage.cart_id;
        additionalData.orderData = order;
      } else {
        content = "Order message";
      }
      break;

    case "image":
      content =
        apiMessage.message?.image?.id || apiMessage.message?.image?.link || "";
      additionalData.caption = apiMessage.message?.image?.caption;
      break;

    case "video":
      content =
        apiMessage.message?.video?.id || apiMessage.message?.video?.link || "";
      additionalData.caption = apiMessage.message?.video?.caption;
      break;

    case "audio":
      content =
        apiMessage.message?.audio?.id || apiMessage.message?.audio?.link || "";
      break;

    case "document":
      content =
        apiMessage.message?.document?.id ||
        apiMessage.message?.document?.link ||
        "";
      additionalData.fileName = apiMessage.message?.document?.filename;
      additionalData.mimeType = apiMessage.message?.document?.mime_type;
      break;

    case "location":
      content = {
        latitude: apiMessage.message?.location?.latitude,
        longitude: apiMessage.message?.location?.longitude,
        name: apiMessage.message?.location?.name,
        address: apiMessage.message?.location?.address,
      };
      break;

    case "contact":
      content = {
        name:
          apiMessage.message?.contacts?.[0]?.name?.formatted_name || "Unknown",
        phone: apiMessage.message?.contacts?.[0]?.phones?.[0]?.phone || "",
      };
      break;

    case "sticker":
      content =
        apiMessage.message?.sticker?.id ||
        apiMessage.message?.sticker?.link ||
        "";
      break;

    default:
      content =
        apiMessage.message?.text?.body ||
        apiMessage.text?.body ||
        apiMessage.message ||
        "Unknown message type";
  }

  return {
    id: apiMessage.id || apiMessage.msg_id,
    type: messageType,
    content: content,
    isUser: isUser,
    status: apiMessage.status || "delivered",
    timestamp: apiMessage.timestamp,
    ...additionalData,
  };
};

// Initial messages for demonstration
const exampleMessages = [
  {
    id: 1,
    type: "text",
    content: "Welcome! How can I assist you?",
    isUser: false,
  },
  {
    id: 2,
    type: "text",
    content: "I need help with my account",
    isUser: true,
    status: "sent",
  },
  {
    id: 3,
    type: "image",
    content:
      "https://fastly.picsum.photos/id/220/200/300.jpg?hmac=XQWeukbBSi6WSlgZllfOJjG8AQQXS9dYI8IqvKpE1ss",
    isUser: false,
  },
  {
    id: 3,
    type: "image",
    content:
      "https://fastly.picsum.photos/id/220/200/300.jpg?hmac=XQWeukbBSi6WSlgZllfOJjG8AQQXS9dYI8IqvKpE1ss",
    isUser: true,
    status: "sent",
  },
  {
    id: 4,
    type: "video",
    content:
      "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4",
    isUser: false,
  },
  {
    id: 5,
    type: "audio",
    content: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    isUser: true,
    status: "sent",
  },
  {
    id: 6,
    type: "document",
    content:
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    isUser: true,
    status: "sent",
  },
  {
    id: 7,
    type: "sticker",
    content: "https://cdn-icons-png.flaticon.com/256/9253/9253922.png",
    isUser: false,
  },
  {
    id: 8,
    type: "location",
    content:
      "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d31258.663075745884!2d78.116567!3d11.670804!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3babf07664000001%3A0x92c6f92f913e44c3!2sNekhop%20Technology%20Services!5e0!3m2!1sen!2sin!4v1744023467639!5m2!1sen!2sin",
    isUser: true,
    status: "sent",
  },
  {
    id: 9,
    type: "contact",
    content: {
      name: "John Doe",
      phone: "+1 123 456 7890",
    },
    isUser: true,
    status: "sent",
  },
  {
    id: 10,
    type: "template",
    content: {
      title: "Meeting Reminder",
      body: "Hey team, just a reminder about the meeting scheduled at 3 PM today. Don't be late!",
      button: "View Details",
      link: "https://kwic.in/",
    },
    isUser: false,
  },
  {
    id: 11,
    type: "button",
    content: {
      text: "Do you want to proceed?",
      buttons: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    },
    isUser: false,
  },
  {
    id: 12,
    type: "interactive",
    content: {
      title: "Choose your plan",
      options: [
        { label: "Basic Plan", value: "basic" },
        { label: "Pro Plan", value: "pro" },
        { label: "Enterprise Plan", value: "enterprise" },
      ],
    },
    isUser: true,
    status: "sent",
  },
  {
    id: 13,
    type: "order",
    content: {
      orderId: "#ORD12345",
      date: "2025-04-07",
      items: [
        { name: "iPhone 15 Pro", qty: 1, price: 1299 },
        { name: "AirPods Pro", qty: 1, price: 249 },
      ],
      total: 1548,
      currency: "USD",
    },
    isUser: false,
  },
];

// Action Dropdown Component
const ActionDropdown = ({ message, handleBtnNavigation, onDelete, onReply, onCopy, onDownload, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const actionItems = [
    {
      label: "Mark as Sent",
      icon: <BiCheck className="h-4 w-4" />,
      onClick: () => {
        handleBtnNavigation(message, "sent");
        setIsOpen(false);
      },
      className: "text-green-700 hover:bg-green-50"
    },
    {
      label: "Mark as Delivered",
      icon: <BiCheckDouble className="h-4 w-4" />,
      onClick: () => {
        handleBtnNavigation(message, "delivered");
        setIsOpen(false);
      },
      className: "text-blue-700 hover:bg-blue-50"
    },
    {
      label: "Mark as Read",
      icon: <BiCheckDouble className="h-4 w-4" />,
      onClick: () => {
        handleBtnNavigation(message, "read");
        setIsOpen(false);
      },
      className: "text-blue-700 hover:bg-blue-50"
    },
    {
      label: "Reply",
      icon: <TiArrowBack className="h-4 w-4" />,
      onClick: () => {
        onReply(message);
        setIsOpen(false);
      },
      className: "text-gray-700 hover:bg-gray-50"
    },
    {
      label: "Copy",
      icon: <IoCopyOutline className="h-4 w-4" />,
      onClick: () => {
        onCopy();
        setIsOpen(false);
      },
      className: "text-gray-700 hover:bg-gray-50",
      show: message.type === "text"
    },
    {
      label: "Download",
      icon: <MdDownload className="h-4 w-4" />,
      onClick: () => {
        onDownload();
        setIsOpen(false);
      },
      className: "text-gray-700 hover:bg-gray-50",
      show: ["image", "video", "audio", "document"].includes(message.type)
    },
    {
      label: "Delete",
      icon: <AiOutlineDelete className="h-4 w-4" />,
      onClick: () => {
        onDelete(message.id);
        setIsOpen(false);
      },
      className: "text-red-700 hover:bg-red-50"
    }
  ].filter(item => item.show !== false);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 hover:bg-gray-200 rounded bg-gray-100 cursor-pointer flex items-center gap-1 ${
          darkMode ? "text-white" : "text-black"
        }`}
      >
        <BsThreeDotsVertical className="h-4 w-4" />
        <ChevronDownIcon className="h-3 w-3" />
      </button>
      
      {isOpen && (
        <div className="absolute top-0 right-0 mt-1 bg-white text-black rounded shadow-lg text-xs z-10 min-w-48 border">
          {actionItems.map((item, index) => (
            <div
              key={index}
              onClick={item.onClick}
              className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer ${item.className}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ChatMessage component renders each message with reply & more options.
const ChatMessage = ({
  message,
  updateMessageStatus,
  primaryColor,
  darkMode,
  onReply,
  onDelete,
  wba_id,
  phone_number_id,
  handleBtnNavigation,
}) => {
  const [showMore, setShowMore] = useState(false);


  useEffect(() => {
    if (
      message.isUser &&
      (message.type === "text" || message.type === "cart") &&
      message.status === "pending" &&
      message.apiPayload
    ) {
      const send = async () => {
        try {
          await WebhookService.push(message.apiPayload);
          updateMessageStatus(message.id, "sent");
          setTimeout(() => {
            updateMessageStatus(message.id, "delivered");
          }, 2000);
        } catch (error) {
          console.error("Error sending message:", error);
          updateMessageStatus(message.id, "error");
        }
      };
      send();
    }
  }, [message, updateMessageStatus]);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.content);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    window.open(message.content, "_blank");
  };

  const actionButtons = (
    <div className="flex space-x-2">
      <ActionDropdown
        message={message}
        handleBtnNavigation={handleBtnNavigation}
        onDelete={onDelete}
        onReply={onReply}
        onCopy={handleCopy}
        onDownload={handleDownload}
        darkMode={darkMode}
      />
    </div>
  );

  const bubbleContent = (
    <div
      className={`py-1 px-2  max-w-xs rounded-lg ${
        message.isUser
          ? "text-gray-700 bg-white"
          : darkMode
          ? "bg-gray-700 text-white"
          : "bg-white text-gray-900 "
      }`}
      // style={{ backgroundColor:   }}
    >
      {message.replyMessage && (
        <div className="mb-2 border-l-4 pl-2 text-xs text-gray-300">
          Replying to:{" "}
          {message.replyMessage.type === "audio"
            ? "Audio Message"
            : message.replyMessage.content}
        </div>
      )}
      {message.type === "text" && <p>{message.content}</p>}
      {message.type === "image" && (
        <div className="space-y-2">
          <img
            src={message.content}
            alt="Image"
            className="rounded-lg max-w-full"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "block";
            }}
          />
          <div className="hidden text-gray-500 text-sm flex items-center justify-center w-full h-32 bg-gray-100 rounded-lg">
            Image not available
          </div>
          {message.caption && (
            <p className="text-sm text-gray-600">{message.caption}</p>
          )}
        </div>
      )}
      {message.type === "video" && (
        <div className="space-y-2">
          <video controls className="max-w-full rounded-lg">
            <source src={message.content} />
            Your browser does not support the video element.
          </video>
          {message.caption && (
            <p className="text-sm text-gray-600">{message.caption}</p>
          )}
        </div>
      )}
      {message.type === "audio" && (
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <HiOutlineMusicNote className="text-blue-500 text-xl" />
          <audio controls className="flex-1">
            <source src={message.content} />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
      {message.type === "document" && (
        <div className="p-4 rounded-2xl border shadow-md bg-white flex items-center gap-4 w-72">
          <div className="text-blue-600 text-3xl">📄</div>
          <div className="flex-1">
            <p className="font-medium text-gray-800 truncate">
              {message.fileName ||
                message.additionalData?.fileName ||
                "Document"}
            </p>
            <p className="text-sm text-gray-500">
              {message.additionalData?.mimeType || "Document File"}
            </p>
          </div>
          <a
            href={message.content}
            download={message.fileName || message.additionalData?.fileName}
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-blue-700 transition"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-white" />
          </a>
        </div>
      )}
      {message.type === "sticker" && (
        <div className="flex justify-center">
          <img
            src={message.content}
            alt="Sticker"
            className="rounded-lg max-w-32 max-h-32 object-contain"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "block";
            }}
          />
          <div className="hidden text-gray-500 text-sm flex items-center justify-center w-32 h-32 bg-gray-100 rounded-lg">
            Sticker
          </div>
        </div>
      )}
      {message.type === "location" && (
        <div className="w-72 bg-white border rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-2">
            <GrLocation className="text-red-500 text-lg" />
            <span className="font-medium text-gray-800">Location</span>
          </div>
          {message.content.latitude && message.content.longitude ? (
            <div className="space-y-2">
              {message.content.name && (
                <div className="text-sm font-medium text-gray-700">
                  {message.content.name}
                </div>
              )}
              {message.content.address && (
                <div className="text-xs text-gray-600">
                  {message.content.address}
                </div>
              )}
              <div className="w-full h-48 bg-gray-100 rounded border">
                <iframe
                  src={`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1000!2d${message.content.longitude}!3d${message.content.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!6e0!7i1337!8i675`}
                  className="w-full h-full rounded"
                  allowFullScreen
                />
              </div>
              <div className="text-xs text-gray-500">
                Lat: {message.content.latitude}, Lng:{" "}
                {message.content.longitude}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Location data not available
            </div>
          )}
        </div>
      )}
      {message.type === "contact" && (
        <div className="flex items-center gap-4 px-4 py-2 border rounded-lg shadow-sm w-72 bg-white">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg font-bold">
            {message.content.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex flex-col flex-1">
            <div className="font-semibold text-gray-900">
              {message.content.name || "Unknown Contact"}
            </div>
            {message.content.phone && (
              <div className="text-sm text-gray-600">
                {message.content.phone}
              </div>
            )}
          </div>
        </div>
      )}
      {message.type === "template" && (
        <div className="w-72 bg-gray-50 border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {message.content.title ||
                message.content.templateName ||
                "Template Message"}
            </h3>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            {message.content.body || "Template content"}
          </p>
          {message.content.bodyVariables &&
            Object.keys(message.content.bodyVariables).length > 0 && (
              <div className="mb-3 p-2 bg-blue-50 rounded text-xs">
                <strong>Variables:</strong>
                {Object.entries(message.content.bodyVariables).map(
                  ([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  )
                )}
              </div>
            )}
          {message.content.button && (
            <a
              href={message.content.link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition cursor-pointer"
            >
              {message.content.button}
            </a>
          )}
        </div>
      )}

      {message.type === "button" && (
        <div className="bg-gray-50 border rounded-lg p-4 w-72 shadow-sm">
          <p className="text-sm text-gray-800 mb-3">{message.content.text}</p>
          <div className="flex gap-2">
            {message.content.buttons?.map((btn, index) => (
              <div
                key={index}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition cursor-pointer"
              >
                {btn.label}
              </div>
            ))}
          </div>
        </div>
      )}
      {message.type === "interactive" && (
        <div className="bg-white border rounded-lg p-4 shadow-sm w-72 max-w-xs">
          <h4 className="text-base font-semibold text-gray-800 mb-3">
            {message.content.title}
          </h4>

          {/* Handle order details interactive messages */}
          {message.content.orderId && (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                Order ID: {message.content.orderId}
              </div>
              <div className="text-sm text-gray-600">
                Status:{" "}
                <span className="font-medium capitalize">
                  {message.content.status}
                </span>
              </div>

              {message.content.items && message.content.items.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    Items:
                  </div>
                  {message.content.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="truncate">
                        {item.name || `Item ${index + 1}`}
                      </span>
                      <span>
                        {message.content.currency || "₹"}
                        {(item.price || 0) * (item.qty || 1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>
                    {message.content.currency || "₹"}
                    {message.content.subtotal?.value || 0}
                  </span>
                </div>
                {message.content.tax?.value > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>
                      {message.content.currency || "₹"}
                      {message.content.tax.value}
                    </span>
                  </div>
                )}
                {message.content.shipping?.value > 0 && (
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span>
                      {message.content.currency || "₹"}
                      {message.content.shipping.value}
                    </span>
                  </div>
                )}
                {message.content.discount?.value > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>
                      -{message.content.currency || "₹"}
                      {message.content.discount.value}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total:</span>
                  <span>
                    {message.content.currency || "₹"}
                    {message.content.total?.value || 0}
                  </span>
                </div>
              </div>

              {message.content.expiration && (
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                  Expires:{" "}
                  {new Date(
                    message.content.expiration.timestamp * 1000
                  ).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Handle regular interactive messages with options */}
          {message.content.options && message.content.options.length > 0 && (
            <div className="flex flex-col gap-2">
              {message.content.options.map((option, index) => (
                <div
                  key={index}
                  className="w-full px-4 py-2 text-sm border rounded text-left hover:bg-gray-100 transition cursor-pointer"
                >
                  {option.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {message.type === "order" && (
        <div className="bg-white p-4 rounded-lg border shadow-md w-72">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-gray-800">
              Order Summary
            </h4>
            <span className="text-xs text-gray-500">
              {message.content.date}
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Order ID: {message.content.orderId}
          </p>
          {message.content.text && (
            <p className="text-sm text-gray-700 mb-3">{message.content.text}</p>
          )}
          {message.content.items && message.content.items.length > 0 ? (
            <div className="space-y-3">
              {message.content.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-2 bg-gray-50 rounded"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 text-sm">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Qty: {item.qty} • {item.currency || "₹"}
                      {item.price} each
                    </div>
                    <div className="text-xs text-gray-500">
                      Product ID: {item.productId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      {item.currency || "₹"}
                      {(item.price * item.qty).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              No items in this order
            </div>
          )}
          <div className="mt-3 border-t pt-2 flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>
              {message.content.currency || "₹"}
              {message.content.total?.toFixed(2) || "0.00"}
            </span>
          </div>
        </div>
      )}

      {message.type === "cart" && (
        <div className="bg-white p-4 rounded-lg border shadow-md w-72">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-gray-800">Cart Items</h4>
            <span className="text-xs text-gray-500">
              {message.selectedProducts?.length || 0} items
            </span>
          </div>
          <div className="space-y-2 mb-3">
            {message.selectedProducts?.map((product, index) => {
              const name = product.name || product.title || "Product";
              const priceStr = (product.price || "0")
                .toString()
                .replace(/[^0-9.]/g, "");
              const price = parseFloat(priceStr) || 0;
              return (
                <div key={index} className="flex justify-between text-sm">
                  <span className="truncate">{name}</span>
                  <span>₹{price.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t pt-2 flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>
              ₹
              {(
                message.selectedProducts?.reduce((sum, p) => {
                  const priceStr = (p.price || "0")
                    .toString()
                    .replace(/[^0-9.]/g, "");
                  return sum + (parseFloat(priceStr) || 0);
                }, 0) || 0
              ).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {message.status && (
        <div className="mt-1 text-xs flex justify-end">
          {message.status === "pending" && <TbClockShare className="" />}
          {message.status === "uploading" &&
            `Uploading... ${message.uploadProgress || 0}%`}
          {message.status === "sent" && <BiCheckDouble className="text-xl" />}
          {message.status === "delivered" && (
            <BiCheckDouble className="text-xl text-blue-500" />
          )}
          {message.status === "error" && "Error"}
        </div>
      )}
    </div>
  );

  return message.isUser ? (
    <div className="flex justify-end items-center space-x-2">
      {actionButtons}
      {bubbleContent}
    </div>
  ) : (
    <div className="flex flex-col items-start space-y-2">
      <div className="flex items-center space-x-2">
        {bubbleContent}
        {actionButtons}
      </div>
    </div>
  );
};

const ChatBot = ({
  primaryColor = "#075E54",
  logoUrl = "/logo.png",
  data,
  wba_id,
  phone_number_id,
  catalog_id,
  wa_id,
  session,
}) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingRecording, setPendingRecording] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [replyMessage, setReplyMessage] = useState(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const mediaRecorder = useRef(null);
  const recordingIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [catalogId, setCatalogId] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const userProfile = searchParams.get("profileName");

  // Fetch messages function
  const fetchMessages = async () => {
    if (phone_number_id && wa_id) {
      try {
        setLoading(true);
        const response = await businessService.getChatMessages(
          phone_number_id,
          wa_id
        );
        if (response.success && response.data) {
          const transformedMessages = response.data.map((msg) =>
            transformMessage(msg, phone_number_id)
          );
          setMessages(transformedMessages);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        // Fallback to example messages on error
        setMessages(exampleMessages);
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages();
  }, [phone_number_id, wa_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  const updateMessageStatus = (id, status) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, status } : msg))
    );
  };

  const updateMessageProgress = (id, progress) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, uploadProgress: progress } : msg
      )
    );
  };

  const updateUploadedMessage = (id, uploadedUrl) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, content: uploadedUrl, status: "sent" } : msg
      )
    );
  };

  // Handle sending a text message.
  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const message = new WBMessages(
        session.phone_number.value.wba_id,
        session.phone_number.value.id
      );
      message.display_phone_number =
        session.phone_number.value.display_phone_number;
      message.phone_number_id = session.phone_number.value.id;
      message.profile = {
        profile: { name: userProfile },
        wa_id: wa_id,
      };
      message.wa_id = wa_id;

      const newMessage = {
        id: Date.now(),
        type: "text",
        content: inputValue,
        isUser: true,
        status: "pending",
        replyMessage: replyMessage,
        apiPayload: message.getTextMessage(inputValue, userProfile),
      };

      setMessages((prev) => [...prev, newMessage]);
      setInputValue("");
      setReplyMessage(null);
    }
  };

  // Handle file upload.
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    let fileType;
    if (file.type.startsWith("image/")) {
    } else if (file.type.startsWith("video/")) {
    } else if (file.type.startsWith("audio/")) {
    } else if (file.type.startsWith("application/")) {
      fileType = "document"; // ✅ Now we handle documents correctly
    } else {
      alert("Unsupported file type");
      return; // Stop further execution if unsupported
    }

    const newMessage = {
      id: Date.now(),
      type: fileType,
      content: "",
      isUser: true,
      status: "uploading",
      uploadProgress: 0,
      fileName: file.name,
    };
    setMessages([...messages, newMessage]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      updateMessageProgress(newMessage.id, progress);
      if (progress >= 100) {
        clearInterval(interval);
        const uploadedUrl = `https://example.com/uploads/${file.name}`;
        updateUploadedMessage(newMessage.id, uploadedUrl);
      }
    }, 300);
    event.target.value = "";
  };

  // Start recording audio.
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const audioChunks = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.current.onstop = () => {
        clearInterval(recordingIntervalRef.current);
        setRecordingTime(0);
        const audioBlob = new Blob(audioChunks);
        const audioUrl = URL.createObjectURL(audioBlob);
        const newRecording = {
          id: Date.now(),
          type: "audio",
          content: audioUrl,
          isUser: true,
          status: "pending",
          replyMessage: replyMessage || null,
        };
        // Store pending recording for confirmation.
        setPendingRecording(newRecording);
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
    }
  };

  // Stop recording audio.
  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  // Confirm sending the recorded audio.
  const confirmRecording = () => {
    if (pendingRecording) {
      const confirmedMessage = {
        ...pendingRecording,
        replyMessage: replyMessage || null,
      };
      setMessages((prev) => [...prev, confirmedMessage]);
      setPendingRecording(null);
      setReplyMessage(null);
    }
  };

  // Discard the recorded audio.
  const discardRecording = () => {
    setPendingRecording(null);
  };

  // Add this function to fetch products
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const catalogId = session?.phone_number?.value?.catalog_id || catalog_id;
      console.log("Fetching products for catalog_id:", catalogId);
      console.log("Session data:", session);

      if (!catalogId) {
        console.error("No catalog_id available");
        alert("No catalog ID found. Please check your configuration.");
        return;
      }

      const response = await businessService.getAllProducts(catalogId, 1, 50);
      console.log("Full API response:", response);

      let productsList = [];

      // The businessService.getAllProducts returns { data: [...], paging: {...} }
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          // Check if items in array are products themselves or contain products
          const firstItem = response.data[0];
          if (
            firstItem &&
            firstItem.products &&
            Array.isArray(firstItem.products)
          ) {
            // Items contain products array
            productsList = response.data.flatMap((catalog) =>
              catalog.products.map((product) => ({
                ...product,
                catalog_id: catalog.catalog_id || catalogId,
              }))
            );
          } else if (firstItem && (firstItem.id || firstItem.retailer_id)) {
            // Items are products themselves
            productsList = response.data.map((product) => ({
              ...product,
              catalog_id: catalogId,
            }));
          }
        } else if (
          response.data.products &&
          Array.isArray(response.data.products)
        ) {
          // response.data has products array directly
          productsList = response.data.products.map((product) => ({
            ...product,
            catalog_id: catalogId,
          }));
        }
      }

      console.log("Final products list:", productsList);
      console.log("Total products:", productsList.length);
      setProducts(productsList);

      if (productsList.length === 0) {
        console.warn("No products found in the response");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      alert(`Failed to fetch products: ${error.message}`);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Add this function to handle product selection
  const toggleProductSelection = (product) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) {
        return prev.filter((p) => p.id !== product.id);
      }
      return [...prev, product];
    });
  };

  // Update your handleSendCart function
  const handleSendCart = () => {
    if (selectedProducts.length === 0) return;

    const message = new WBMessages(
      session.phone_number.value.wba_id,
      session.phone_number.value.id
    );
    message.display_phone_number =
      session.phone_number.value.display_phone_number;
    message.phone_number_id = session.phone_number.value.id;
    message.profile = {
      profile: { name: userProfile },
      wa_id: wa_id,
    };
    message.wa_id = wa_id;

    const cartContent = selectedProducts
      .map((p) => `${p.name} (₹${p.price})`)
      .join(", ");

    const newMessage = {
      id: Date.now(),
      type: "cart",
      content: `Cart: ${selectedProducts.length} items`,
      isUser: true,
      status: "pending",
      replyMessage: replyMessage,
      apiPayload: message.getOrderMessage(selectedProducts, userProfile),
      selectedProducts: selectedProducts,
    };

    setMessages((prev) => [...prev, newMessage]);
    setSelectedProducts([]);
    setShowCartPopup(false);
    setReplyMessage(null);
  };
  const handleReply = (message) => {
    console.log("Setting reply message:", message);
    setReplyMessage(message);
  };

  const handleDelete = async (id) => {
    try {
      // Delete from server
      await businessService.deleteMessage(phone_number_id, wa_id, id);
      
      // Update local state
      setMessages(messages.filter((msg) => msg.id !== id));
      
      toast.success("Message deleted successfully");
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error("Failed to delete message");
    }
  };

  console.log("replyMessage", replyMessage);

  return (
    <div
      className={`flex flex-col w-full h-screen border shadow-lg overflow-hidden ${
        darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"
      }`}
    >
      {/* PoweredBy */}
      <div
        className={`text-center text-sm py-1 border-t ${
          darkMode ? "bg-gray-800 text-gray-400" : "text-gray-500"
        }`}
      >
        Powered by Kwic⚡
      </div>

      {showCartPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-full max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Select Products
              </h3>
              <button
                onClick={() => setShowCartPopup(false)}
                className="text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {loadingProducts ? (
                <div className="text-center py-4">
                  <VscLoading className="animate-spin text-2xl mx-auto text-gray-500" />
                  <p className="text-gray-500 mt-2">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No products available
                </div>
              ) : (
                products.map((product, idx) => {
                  const productId = product.id || product.retailer_id || idx;
                  const productName =
                    product.name || product.title || "Unnamed Product";
                  const priceString = (
                    product.price ||
                    product.sale_price ||
                    "0"
                  )
                    .toString()
                    .replace(/[^0-9.]/g, "");
                  const productPrice = parseFloat(priceString) || 0;
                  const productImage =
                    product.image_url ||
                    product.imageUrl ||
                    product.image ||
                    "/placeholder-product.png";

                  return (
                    <div
                      key={productId}
                      className="flex items-center p-2 border rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.some(
                          (p) => (p.id || p.retailer_id) === productId
                        )}
                        onChange={() => toggleProductSelection(product)}
                        className="mr-3"
                      />
                      <img
                        src={productImage}
                        alt={productName}
                        className="w-10 h-10 object-cover mr-3"
                        onError={(e) => {
                          e.target.src = "/placeholder-product.png";
                        }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {productName}
                        </p>
                        <p className="text-sm text-gray-600">
                          ₹{productPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCartPopup(false)}
                className="px-4 py-2 text-gray-600 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCart}
                disabled={selectedProducts.length === 0}
                className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
              >
                Send Cart ({selectedProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TopBar */}
      <div
        className="flex justify-between items-center p-4"
        style={{ backgroundColor: primaryColor, color: "white" }}
      >
        <div className="flex items-center space-x-2 ">
          {/* <img src={logoUrl} alt="Logo" className="h-8 w-8" /> */}
          <span className="font-semibold">ChatBot</span>
        </div>
        <div className="flex space-x-3">
          <div
            onClick={fetchMessages}
            className="cursor-pointer"
          >
            <ArrowPathIcon className="h-6 w-6 text-gray-200" />
          </div>
          <div
            onClick={() => setDarkMode(!darkMode)}
            className="cursor-pointer"
          >
            {darkMode ? (
              <SunIcon className="h-6 w-6 text-yellow-400" />
            ) : (
              <MoonIcon className="h-6 w-6 text-gray-200" />
            )}
          </div>
          <Cog6ToothIcon className="h-6 w-6 cursor-pointer" />
        </div>
      </div>

      {/* ChatMessages */}
      <div
        className={`flex-1 p-4 overflow-y-auto space-y-4 ${
          darkMode ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <VscLoading className="animate-spin text-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              updateMessageStatus={updateMessageStatus}
              primaryColor={primaryColor}
              darkMode={darkMode}
              onReply={handleReply}
              onDelete={handleDelete}
              wba_id={wba_id}
              phone_number_id={phone_number_id}
              handleBtnNavigation={handleBtnNavigation}
            />
          ))
        )}
        {isBotTyping && (
          <div className="flex justify-start items-center ">
            <div className="p-3 max-w-xs rounded-lg bg-gray-300 text-gray-800 animate-pulse">
              <VscLoading className="animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending Recording Confirmation Panel */}
      {pendingRecording && (
        <div className="flex items-center p-4 border-t bg-gray-800 text-white justify-between">
          <span className="mr-4">Recorded: {formatTime(recordingTime)}</span>
          {/* Audio playback control to review the pending recording */}
          <audio controls src={pendingRecording.content} className="h-6 w-40" />
          <div className="flex space-x-2">
            <div
              onClick={confirmRecording}
              className="p-2 rounded bg-green-500 cursor-pointer hover:opacity-80"
            >
              Send
            </div>
            <div
              onClick={discardRecording}
              className="p-2 rounded cursor-pointer bg-red-500 hover:opacity-80"
            >
              Discard
            </div>
          </div>
        </div>
      )}
      {replyMessage && (
        <div
          className={`max-h-32 w-full border-l-4 rounded-lg cursor-pointer  bg-neutral-20 flex justify-between p-1 ${
            !replyMessage?.isUser ? "border-violet-500" : "border-[#075E54]"
          }`}
        >
          <div className=" text-sm flex w-full item-center">
            <div className="space-y-1 ">
              <p className={`font-bold text-[#075E54]`}>
                {replyMessage?.isUser ? "You" : "System"}{" "}
              </p>
              {/* {replyMessage.type === "audio" && (
                <audio controls className="h-6">
                  <source src={replyMessage.content} />
                </audio>
              )} */}

              {replyMessage.type === "audio" && (
                <div className="flex item-center justin-end  w-full">
                  <div className="flex items-center gap-1.5 ">
                    <HiOutlineMusicNote className="text-base" />
                    <span className="text-base ">Audio</span>
                  </div>
                </div>
              )}

              {replyMessage.type === "text" && (
                <span>
                  {replyMessage.content.length > 30
                    ? replyMessage.content.substring(0, 30) + "..."
                    : replyMessage.content}
                </span>
              )}

              {replyMessage.type === "image" && (
                <div className="flex item-center justin-end  w-full">
                  <div className="flex items-center gap-1.5 ">
                    <RxImage className="text-base" />
                    <span className="text-base ">Image</span>
                  </div>
                </div>
              )}

              {replyMessage.type === "video" && (
                <div className="flex item-center justin-end  w-full">
                  <div className="flex items-center gap-1.5 ">
                    <HiOutlineVideoCamera className="text-xl" />
                    <span className="text-base ">Video</span>
                  </div>
                </div>
              )}

              {replyMessage.type === "document" && (
                <div className="flex item-center justin-end  w-full">
                  <div className="flex items-center gap-1.5 ">
                    <IoDocumentTextOutline className="text-xl" />
                    <span className="text-base ">Document</span>
                  </div>
                </div>
              )}

              {replyMessage.type === "sticker" && (
                <img
                  src={replyMessage?.content}
                  alt={replyMessage?.type}
                  loading="eager"
                  className="w-12 h-11 rounded mr-4"
                />
              )}
              {replyMessage.type === "location" && (
                <div className="flex item-center justin-end  w-full">
                  <div className="flex items-center gap-1.5 ">
                    <GrLocation className="text-base" />
                    <span className="text-base ">Location</span>
                  </div>
                </div>
              )}

              {replyMessage.type === "contact" && (
                <div className="flex item-center w-full">
                  <div className="flex items-center gap-1.5 w-full ">
                    <FaRegUser className="text-lg" />
                    <p className=" w-full text-sm">
                      {replyMessage.content.name}
                    </p>
                  </div>
                </div>
                // <span>
                //   {replyMessage.content.name}
                // </span>
              )}

              {replyMessage.type === "template" && (
                <span>{replyMessage.content.title}</span>
              )}

              {replyMessage.type === "button" && (
                <span>{replyMessage.content.text}</span>
              )}

              {replyMessage.type === "interactive" && (
                <span>{replyMessage.content.title}</span>
              )}

              {replyMessage.type === "order" && (
                <span>Order: {replyMessage.content.orderId}</span>
              )}
            </div>
            <div className="w-full flex item-center justify-end">
              {" "}
              {replyMessage.type === "image" && (
                <img
                  src={replyMessage?.content}
                  alt={replyMessage?.type}
                  className="w-12 h-11 rounded mr-4"
                />
              )}
              {replyMessage.type === "location" && (
                <img
                  src={replyMessage?.content}
                  alt={replyMessage?.type}
                  className="w-12 h-11 rounded mr-4"
                />
              )}
            </div>
          </div>
          <div className="cursor-pointer" onClick={() => setReplyMessage(null)}>
            <IoCloseCircleOutline className="text-2xl" />
          </div>
        </div>
      )}

      {/* Audio Record Controller or Normal Chat Input */}
      {isRecording ? (
        <div className="flex items-center p-4  bg-gray-800 text-white">
          <span className="mr-4">Recording: {formatTime(recordingTime)}</span>
          <button
            onClick={stopRecording}
            className="p-2 rounded bg-red-500 hover:opacity-80"
          >
            Stop
          </button>
        </div>
      ) : (
        <div
          className={`flex items-center p-4 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <div className="space-x-2 flex">
            <div
              onClick={async () => {
                setShowCartPopup(true);
                await fetchProducts();
              }}
              className="p-2 rounded-full bg-gray-300  hover:bg-[#075E54] text-black cursor-pointer hover:text-white hover:opacity-80"
            >
              <ShoppingCartIcon className="h-5 w-5" />
            </div>

            <div
              onClick={() => fileInputRef.current.click()}
              className="p-2 rounded-full bg-gray-300  hover:bg-[#075E54] text-black cursor-pointer hover:text-white hover:opacity-80"
            >
              <PaperClipIcon className="h-5 w-5" />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              onChange={handleFileUpload}
            />
            <div
              onClick={startRecording}
              className="p-2 rounded-full bg-gray-300 hover:bg-[#075E54] text-black cursor-pointer hover:text-white hover:opacity-80"
            >
              <MicrophoneIcon className="h-5 w-5 " />
            </div>
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            className={`flex-1 mx-2 px-4 py-2 border rounded-full focus:ring-2 focus:ring-blue-500 ${
              darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"
            }`}
          />
          <div
            onClick={handleSendMessage}
            className="p-2 rounded-full hover:opacity-80 cursor-pointer bg-gray-300"
            style={{ backgroundColor: primaryColor, color: "white" }}
          >
            <PaperAirplaneIcon className="h-5 w-5 " />
          </div>
        </div>
      )}

      {/* Reply Banner */}

      {/* PoweredBy */}
      <div
        className={`text-center text-sm py-1 border-t ${
          darkMode ? "bg-gray-800 text-gray-400" : "text-gray-500"
        }`}
      >
        Powered by Kwic⚡
      </div>
    </div>
  );
};

export default ChatBot;
